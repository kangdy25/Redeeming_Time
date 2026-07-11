from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Calendar, CalendarMember, Category, Event, EventAttendee, Task
from .services import analyze_schedule_density


class CalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calendar
        fields = ['id', 'title', 'description', 'theme_color', 'is_global', 'created_at']
        read_only_fields = ['id', 'is_global', 'created_at']


class CalendarMemberSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = CalendarMember
        fields = ['id', 'calendar', 'user', 'user_detail', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'calendar', 'name', 'color_code', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        return attrs


class EventSerializer(serializers.ModelSerializer):
    congestion_warning = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id',
            'calendar',
            'creator',
            'title',
            'description',
            'start_time',
            'end_time',
            'is_all_day',
            'rrule',
            'color_code',
            'congestion_warning',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'congestion_warning', 'created_at', 'updated_at']

    def validate(self, attrs):
        instance = self.instance
        calendar = attrs.get('calendar') or getattr(instance, 'calendar', None)
        start_time = attrs.get('start_time') or getattr(instance, 'start_time', None)
        end_time = attrs.get('end_time') or getattr(instance, 'end_time', None)

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'Event end_time must be after start_time.'})
        if calendar and calendar.is_global:
            raise serializers.ValidationError({'calendar': 'Events cannot be created in the global calendar.'})

        return attrs

    @extend_schema_field(serializers.DictField)
    def get_congestion_warning(self, obj):
        return analyze_schedule_density(obj.calendar, obj.start_time, obj.end_time, excluded_event_id=obj.id)


class EventAttendeeSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = EventAttendee
        fields = ['id', 'event', 'user', 'user_detail', 'status']
        read_only_fields = ['id']

    def validate(self, attrs):
        event = attrs.get('event') or getattr(self.instance, 'event', None)
        user = attrs.get('user') or getattr(self.instance, 'user', None)
        if event and user and not CalendarMember.objects.filter(calendar=event.calendar, user=user).exists():
            raise serializers.ValidationError({'user': 'Attendee must be a member of the event calendar.'})
        return attrs


class TaskSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source='category', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'calendar',
            'category',
            'category_detail',
            'creator',
            'title',
            'is_completed',
            'target_date',
            'priority',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'creator', 'created_at', 'updated_at']

    def validate(self, attrs):
        instance = self.instance
        calendar = attrs.get('calendar') or getattr(instance, 'calendar', None)
        category = attrs.get('category') or getattr(instance, 'category', None)

        if category and calendar and category.calendar_id != calendar.id:
            raise serializers.ValidationError({'category': 'Category must belong to the selected calendar.'})

        return attrs
