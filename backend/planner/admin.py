from django.contrib import admin

from .models import Calendar, CalendarMember, Category, Event, EventAttendee, Task


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ('title', 'theme_color', 'created_at')
    search_fields = ('title',)


@admin.register(CalendarMember)
class CalendarMemberAdmin(admin.ModelAdmin):
    list_display = ('calendar', 'user', 'role', 'joined_at')
    list_filter = ('role',)
    search_fields = ('calendar__title', 'user__email')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'calendar', 'color_code', 'created_at')
    search_fields = ('name', 'calendar__title')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'calendar', 'creator', 'start_time', 'end_time', 'is_all_day')
    list_filter = ('is_all_day',)
    search_fields = ('title', 'calendar__title', 'creator__email')


@admin.register(EventAttendee)
class EventAttendeeAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'status')
    list_filter = ('status',)
    search_fields = ('event__title', 'user__email')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'calendar', 'category', 'creator', 'target_date', 'priority', 'is_completed', 'order')
    list_filter = ('priority', 'is_completed', 'category')
    search_fields = ('title', 'calendar__title', 'creator__email')
