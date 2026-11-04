from decimal import Decimal

from rest_framework import serializers


class PointSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    accuracy = serializers.FloatField(required=False, allow_null=True, min_value=0)

    def coords(self):
        d = self.validated_data
        return (
            Decimal(str(round(d["latitude"], 6))),
            Decimal(str(round(d["longitude"], 6))),
            d.get("accuracy"),
        )
