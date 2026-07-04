from rest_framework import permissions

from .models import Calendar, CalendarMember


def calendar_from_object(obj):
    if isinstance(obj, Calendar):
        return obj
    if isinstance(obj, CalendarMember):
        return obj.calendar
    if hasattr(obj, 'calendar'):
        return obj.calendar
    if hasattr(obj, 'event'):
        return obj.event.calendar
    return None


class IsCalendarMemberReadEditorWrite(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        calendar = calendar_from_object(obj)
        if calendar is None:
            return False

        membership = CalendarMember.objects.filter(calendar=calendar, user=request.user).first()
        if not membership:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return membership.can_edit


class IsCalendarOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        calendar = calendar_from_object(obj)
        if calendar is None:
            return False
        return CalendarMember.objects.filter(
            calendar=calendar,
            user=request.user,
            role=CalendarMember.Role.OWNER,
        ).exists()
