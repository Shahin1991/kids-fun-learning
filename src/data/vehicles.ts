import type { FactCategory } from "./facts";

export const VEHICLES: FactCategory[] = [
  {
    id: "road",
    label: "Road",
    icon: "🛣️",
    items: [
      { id: "car", art: "/art/vehicles/car.svg", label: "Car", emoji: "🚗", sound: "Vroom vroom!", fact: "Cars carry a few people. Most use petrol or electricity." },
      { id: "bus", art: "/art/vehicles/bus.svg", label: "Bus", emoji: "🚌", sound: "Beep beep!", fact: "A bus can carry lots of people at once." },
      { id: "fire", art: "/art/vehicles/fire.svg", label: "Fire Truck", emoji: "🚒", sound: "Nee naw nee naw!", fact: "Fire trucks carry water and ladders to help people." },
      { id: "ambulance", art: "/art/vehicles/ambulance.svg", label: "Ambulance", emoji: "🚑", sound: "Wee woo wee woo!", fact: "Ambulances rush people to the hospital." },
      { id: "police", art: "/art/vehicles/police.svg", label: "Police Car", emoji: "🚓", sound: "Wee woo!", fact: "Police cars help keep everyone safe." },
      { id: "tractor", art: "/art/vehicles/tractor.svg", label: "Tractor", emoji: "🚜", sound: "Put put put!", fact: "Tractors help farmers work the land." },
      { id: "truck", art: "/art/vehicles/truck.svg", label: "Truck", emoji: "🚚", sound: "Honk honk!", fact: "Trucks deliver food and parcels." },
      { id: "bike", art: "/art/vehicles/bike.svg", label: "Bicycle", emoji: "🚲", sound: "Ring ring!", fact: "You pedal a bicycle with your own legs." },
    ],
  },
  {
    id: "sky",
    label: "Sky",
    icon: "☁️",
    items: [
      { id: "plane", art: "/art/vehicles/plane.svg", label: "Airplane", emoji: "✈️", sound: "Whoosh!", fact: "Airplanes fly high above the clouds." },
      { id: "helicopter", art: "/art/vehicles/helicopter.svg", label: "Helicopter", emoji: "🚁", sound: "Whop whop whop!", fact: "A helicopter's spinning blades lift it straight up." },
      { id: "rocket", art: "/art/vehicles/rocket.svg", label: "Rocket", emoji: "🚀", sound: "Three, two, one, blast off!", fact: "Rockets are the fastest vehicles. They fly to space." },
      { id: "balloon", art: "/art/vehicles/balloon.svg", label: "Hot Air Balloon", emoji: "🎈", sound: "Whoooosh!", fact: "Hot air makes a balloon float up." },
    ],
  },
  {
    id: "rail-water",
    label: "Rail & Water",
    icon: "🌊",
    items: [
      { id: "train", art: "/art/vehicles/train.svg", label: "Train", emoji: "🚂", sound: "Choo choo!", fact: "Trains run on tracks and pull many carriages." },
      { id: "metro", art: "/art/vehicles/metro.svg", label: "Metro", emoji: "🚇", sound: "Rumble rumble!", fact: "A metro runs under the city." },
      { id: "ship", art: "/art/vehicles/ship.svg", label: "Ship", emoji: "🚢", sound: "Toot toot!", fact: "Big ships carry people and cargo across the sea." },
      { id: "boat", art: "/art/vehicles/boat.svg", label: "Sailboat", emoji: "⛵", sound: "Swish swish!", fact: "Sailboats use wind to move." },
    ],
  },
];
