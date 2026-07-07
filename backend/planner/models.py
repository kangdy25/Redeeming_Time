from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


hex_color_validator = RegexValidator(
    regex=r'^#[0-9A-Fa-f]{6}$',
    message='Use a valid hex color code such as #2F80ED.',
)


class Calendar(models.Model):
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    theme_color = models.CharField(max_length=7, validators=[hex_color_validator], default='#2F80ED')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class CalendarMember(models.Model):
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        EDITOR = 'EDITOR', 'Editor'
        VIEWER = 'VIEWER', 'Viewer'

    calendar = models.ForeignKey(Calendar, related_name='memberships', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='calendar_memberships', on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['calendar', 'user'], name='unique_calendar_member'),
        ]
        ordering = ['calendar_id', 'user_id']

    @property
    def can_edit(self):
        return self.role in {self.Role.OWNER, self.Role.EDITOR}

    def __str__(self):
        return f'{self.user} in {self.calendar} as {self.role}'


class Category(models.Model):
    calendar = models.ForeignKey(Calendar, related_name='categories', on_delete=models.CASCADE)
    name = models.CharField(max_length=80)
    color_code = models.CharField(max_length=7, validators=[hex_color_validator])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['calendar', 'name'], name='unique_category_name_per_calendar'),
        ]
        ordering = ['name']

    def __str__(self):
        return self.name


class Event(models.Model):
    calendar = models.ForeignKey(Calendar, related_name='events', on_delete=models.CASCADE)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='created_events', null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    rrule = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time', 'title']
        indexes = [
            models.Index(fields=['calendar', 'start_time']),
            models.Index(fields=['calendar', 'end_time']),
        ]

    def __str__(self):
        return self.title


class EventAttendee(models.Model):
    class Status(models.TextChoices):
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'
        PENDING = 'PENDING', 'Pending'

    event = models.ForeignKey(Event, related_name='attendees', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='event_attendances', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['event', 'user'], name='unique_event_attendee'),
        ]
        ordering = ['event_id', 'user_id']

    def __str__(self):
        return f'{self.user} attending {self.event}'


class Task(models.Model):
    class Priority(models.TextChoices):
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'
        NONE = 'NONE', 'None'

    calendar = models.ForeignKey(Calendar, related_name='tasks', on_delete=models.CASCADE)
    category = models.ForeignKey(Category, related_name='tasks', null=True, blank=True, on_delete=models.SET_NULL)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='created_tasks', on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    is_completed = models.BooleanField(default=False)
    target_date = models.DateField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NONE)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['target_date', 'order', 'created_at']
        indexes = [
            models.Index(fields=['calendar', 'target_date', 'is_completed']),
        ]

    def __str__(self):
        return self.title

# Create your models here.
