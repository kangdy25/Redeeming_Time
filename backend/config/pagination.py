from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Bound collection responses so a single request cannot load an account's history."""

    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 200

