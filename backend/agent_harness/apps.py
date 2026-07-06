from django.apps import AppConfig


class AgentHarnessConfig(AppConfig):
    name = 'agent_harness'

    def ready(self):
        import agent_harness.schema  # noqa: F401
