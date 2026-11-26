"""Request body parsing.

Every API endpoint expects a JSON object ({...}). A JSON list or a bare string used to reach the views and
crash them (500). Refuse it up front with a clear 400 instead.
"""
from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser


class ObjectJSONParser(JSONParser):
    def parse(self, stream, media_type=None, parser_context=None):
        data = super().parse(stream, media_type, parser_context)
        if not isinstance(data, dict):
            raise ParseError("Send the details as a JSON object.")
        return data
