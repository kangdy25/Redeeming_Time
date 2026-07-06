from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema

from planner.models import Task
from planner.serializers import TaskSerializer

from .authentication import AgentScopedJWTAuthentication
from .permissions import IsAgentRequest
from .serializers import (
    CalendarAnalyticsQuerySerializer,
    CalendarAnalyticsResponseSerializer,
    OverdueTasksQuerySerializer,
    PriorityRequestSerializer,
    RolloverRequestSerializer,
    RolloverResponseSerializer,
)
from .services import (
    adjust_task_priority,
    execute_task_rollover,
    fetch_calendar_analytics,
    get_overdue_tasks,
    on_task_failed,
)


class AgentSkillViewSet(viewsets.ViewSet):
    authentication_classes = [AgentScopedJWTAuthentication]
    permission_classes = [IsAgentRequest]

    @extend_schema(
        parameters=[OverdueTasksQuerySerializer],
        responses=TaskSerializer(many=True),
    )
    @action(detail=False, methods=['get'], url_path='overdue-tasks')
    def overdue_tasks(self, request):
        calendar_id = request.query_params.get('calendar_id')
        if not calendar_id:
            return Response({'detail': 'calendar_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = TaskSerializer(get_overdue_tasks(calendar_id), many=True)
        return Response(serializer.data)

    @extend_schema(
        request=RolloverRequestSerializer,
        responses=RolloverResponseSerializer,
    )
    @action(detail=False, methods=['post'], url_path='rollover')
    def rollover(self, request):
        task_ids = request.data.get('task_ids')
        if not task_ids:
            calendar_id = request.data.get('calendar_id')
            return Response(on_task_failed(calendar_id=calendar_id))
        return Response(execute_task_rollover(task_ids))

    @extend_schema(
        parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)],
        request=PriorityRequestSerializer,
        responses=TaskSerializer,
    )
    @action(detail=True, methods=['post'], url_path='priority')
    def priority(self, request, pk=None):
        priority = request.data.get('priority')
        if priority not in Task.Priority.values:
            return Response({'detail': 'priority must be HIGH, MEDIUM, LOW, or NONE.'}, status=status.HTTP_400_BAD_REQUEST)
        task = adjust_task_priority(pk, priority)
        return Response(TaskSerializer(task).data)

    @extend_schema(
        parameters=[CalendarAnalyticsQuerySerializer],
        responses=CalendarAnalyticsResponseSerializer,
    )
    @action(detail=False, methods=['get'], url_path='calendar-analytics')
    def analytics(self, request):
        period = request.query_params.get('period', 'week')
        return Response(fetch_calendar_analytics(request.user.id, period))
