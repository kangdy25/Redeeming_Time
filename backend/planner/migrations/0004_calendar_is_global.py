from django.db import migrations, models


def mark_existing_global_calendars(apps, schema_editor):
    Calendar = apps.get_model('planner', 'Calendar')
    Calendar.objects.filter(title='전체 캘린더').update(is_global=True)


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0003_event_color_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='calendar',
            name='is_global',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_global_calendars, migrations.RunPython.noop),
    ]
