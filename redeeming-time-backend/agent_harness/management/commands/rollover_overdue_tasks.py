from django.core.management.base import BaseCommand

from agent_harness.services import on_task_failed


class Command(BaseCommand):
    help = 'Run the on_task_failed hook and roll overdue incomplete tasks forward to today.'

    def add_arguments(self, parser):
        parser.add_argument('--calendar-id', type=int, default=None)

    def handle(self, *args, **options):
        result = on_task_failed(calendar_id=options['calendar_id'])
        self.stdout.write(
            self.style.SUCCESS(
                f"Rolled over {result['updated_count']} tasks to {result['target_date']}."
            )
        )
