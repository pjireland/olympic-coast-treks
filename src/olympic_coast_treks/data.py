"""Static data necessary for calculations."""

RESTRICTIONS = {}
RESTRICTIONS["south"] = [
    {
        "restriction_ft": 5,
        "start_miles": 0.6,
        "end_miles": 0.8,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 3,
        "start_miles": 1.4,
        "end_miles": 1.8,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 2,
        "start_miles": 1.8,
        "end_miles": 2.2,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 4,
        "start_miles": 12.5,
        "end_miles": 12.9,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 1,
        "start_miles": 13.1,
        "end_miles": 13.4,
        "headland_alternative": True,
    },
    {
        "restriction_ft": 4.5,
        "start_miles": 14,
        "end_miles": 14.1,
        "headland_alternative": True,
    },
]
RESTRICTIONS["middle"] = [
    {
        "restriction_ft": 5.0,
        "start_miles": 1.2,
        "end_miles": 1.6,
        "headland_alternative": True,
    },
    {
        "restriction_ft": 5.0,
        "start_miles": 2.3,
        "end_miles": 2.7,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 4.0,
        "start_miles": 4.2,
        "end_miles": 4.6,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 5.5,
        "start_miles": 5.0,
        "end_miles": 5.4,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 4.0,
        "start_miles": 7.2,
        "end_miles": 7.8,
        "headland_alternative": True,
    },
    {
        "restriction_ft": 5.5,
        "start_miles": 8.8,
        "end_miles": 9.2,
        "headland_alternative": True,
    },
    {
        "restriction_ft": 6.0,
        "start_miles": 11.9,
        "end_miles": 12.3,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 5.0,
        "start_miles": 14.9,
        "end_miles": 15.3,
        "headland_alternative": False,
    },
]

LOCATIONS = {}
LOCATIONS["south"] = [
    {
        "name": "Oil City",
        "distance_miles": 0.0,
        "campsite": False,
        "trailhead": True,
    },
    {
        "name": "Headland trail north of Oil City",
        "distance_miles": 0.6,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Jefferson Cove",
        "distance_miles": 2.6,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Mosquito Creek",
        "distance_miles": 6.1,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Headland trail south of Goodman Creek",
        "distance_miles": 8.3,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Headland trail north of Goodman Creek",
        "distance_miles": 9.8,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Toleak Point",
        "distance_miles": 10.7,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Strawberry Point",
        "distance_miles": 11.7,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Scott Creek",
        "distance_miles": 13.1,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Headland trail north of Scotts Bluff",
        "distance_miles": 13.4,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Headland trail south of Taylor Point",
        "distance_miles": 14.0,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Headland trail on Strawberry Bay",
        "distance_miles": 15.2,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Third Beach",
        "distance_miles": 15.6,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "La Push Road",
        "distance_miles": 17.0,
        "campsite": False,
        "trailhead": True,
    },
]
LOCATIONS["middle"] = [
    {
        "name": "Rialto Beach",
        "distance_miles": 0.0,
        "campsite": False,
        "trailhead": True,
    },
    {
        "name": "Ellen Creek",
        "distance_miles": 0.8,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Hole-in-the-Wall",
        "distance_miles": 1.4,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Chilean Memorial",
        "distance_miles": 3.7,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Cape Johnson",
        "distance_miles": 4.4,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Headland trail south of Jagged Island",
        "distance_miles": 6.6,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Headland trail north of Jagged Island",
        "distance_miles": 7.6,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Cedar Creek",
        "distance_miles": 8.8,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Norwegian Memorial",
        "distance_miles": 10.0,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Yellow Banks",
        "distance_miles": 15.1,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "South Sand Point",
        "distance_miles": 16.6,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Sand Point",
        "distance_miles": 17.2,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Ozette Trailhead",
        "distance_miles": 20.2,
        "campsite": False,
        "trailhead": True,
    },
]
LOCATIONS["north"] = [
    {
        "name": "Ozette Trailhead",
        "distance_miles": 0.0,
        "campsite": False,
        "trailhead": True,
    },
    {
        "name": "Cape Alava",
        "distance_miles": 3.3,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Tskawahyah Island",
        "distance_miles": 4.1,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "South Side of Ozette River",
        "distance_miles": 5.6,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "North Side of Ozette River",
        "distance_miles": 5.7,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Seafield Creek",
        "distance_miles": 7.7,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Point of Arches",
        "distance_miles": 11.3,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Petroleum Creek",
        "distance_miles": 12.3,
        "campsite": True,
        "trailhead": False,
    },
    {
        "name": "Headland trail to Hatchery Road",
        "distance_miles": 13.7,
        "campsite": False,
        "trailhead": False,
    },
    {
        "name": "Hatchery Road",
        "distance_miles": 15.9,
        "campsite": False,
        "trailhead": True,
    },
]
RESTRICTIONS["north"] = [
    {
        "restriction_ft": 5.0,
        "start_miles": 4.7,
        "end_miles": 5.1,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 4.0,
        "start_miles": 5.1,
        "end_miles": 5.5,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 6.0,
        "start_miles": 5.9,
        "end_miles": 6.3,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 5.5,
        "start_miles": 8.9,
        "end_miles": 9.2,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 4.0,
        "start_miles": 9.2,
        "end_miles": 9.3,
        "headland_alternative": True,
    },
    {
        "restriction_ft": 6.0,
        "start_miles": 10.5,
        "end_miles": 10.9,
        "headland_alternative": False,
    },
    {
        "restriction_ft": 4.5,
        "start_miles": 11.2,
        "end_miles": 11.5,
        "headland_alternative": True,
    },
]
