from rest_framework import serializers


class OverdueTasksQuerySerializer(serializers.Serializer):
    calendar_id = serializers.IntegerField()


class RolloverRequestSerializer(serializers.Serializer):
    task_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    calendar_id = serializers.IntegerField(required=False)


class RolloverResponseSerializer(serializers.Serializer):
    updated_count = serializers.IntegerField()
    target_date = serializers.DateField()
    task_ids = serializers.ListField(child=serializers.IntegerField())


class PriorityRequestSerializer(serializers.Serializer):
    priority = serializers.ChoiceField(choices=['HIGH', 'MEDIUM', 'LOW', 'NONE'])


class CalendarAnalyticsQuerySerializer(serializers.Serializer):
    period = serializers.ChoiceField(choices=['day', 'week', 'month'], required=False, default='week')


class CategoryAnalyticsSerializer(serializers.Serializer):
    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    color_code = serializers.CharField()
    task_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    open_count = serializers.IntegerField()


class CalendarAnalyticsResponseSerializer(serializers.Serializer):
    period = serializers.ChoiceField(choices=['day', 'week', 'month'])
    start_date = serializers.DateField()
    categories = CategoryAnalyticsSerializer(many=True)
