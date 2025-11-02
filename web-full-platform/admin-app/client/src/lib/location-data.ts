// Comprehensive location data for address forms
export interface Country {
  code: string;
  name: string;
  states: State[];
}

export interface State {
  code: string;
  name: string;
  cities: string[];
}

export const LOCATION_DATA: Country[] = [
  {
    code: "US",
    name: "United States",
    states: [
      {
        code: "AL",
        name: "Alabama",
        cities: ["Birmingham", "Montgomery", "Mobile", "Huntsville", "Tuscaloosa", "Hoover", "Dothan", "Auburn", "Decatur", "Madison"]
      },
      {
        code: "AK",
        name: "Alaska",
        cities: ["Anchorage", "Fairbanks", "Juneau", "Wasilla", "Sitka", "Ketchikan", "Kenai", "Kodiak", "Bethel", "Palmer"]
      },
      {
        code: "AZ",
        name: "Arizona",
        cities: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale", "Glendale", "Gilbert", "Tempe", "Peoria", "Surprise"]
      },
      {
        code: "AR",
        name: "Arkansas",
        cities: ["Little Rock", "Fort Smith", "Fayetteville", "Springdale", "Jonesboro", "North Little Rock", "Conway", "Rogers", "Pine Bluff", "Bentonville"]
      },
      {
        code: "CA",
        name: "California",
        cities: ["Los Angeles", "San Diego", "San Jose", "San Francisco", "Fresno", "Sacramento", "Long Beach", "Oakland", "Bakersfield", "Anaheim"]
      },
      {
        code: "CO",
        name: "Colorado",
        cities: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Lakewood", "Thornton", "Arvada", "Westminster", "Pueblo", "Centennial"]
      },
      {
        code: "CT",
        name: "Connecticut",
        cities: ["Bridgeport", "New Haven", "Hartford", "Stamford", "Waterbury", "Norwalk", "Danbury", "New Britain", "West Hartford", "Greenwich"]
      },
      {
        code: "DE",
        name: "Delaware",
        cities: ["Wilmington", "Dover", "Newark", "Middletown", "Smyrna", "Milford", "Seaford", "Georgetown", "Elsmere", "New Castle"]
      },
      {
        code: "FL",
        name: "Florida",
        cities: ["Jacksonville", "Miami", "Tampa", "Orlando", "St. Petersburg", "Hialeah", "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral"]
      },
      {
        code: "GA",
        name: "Georgia",
        cities: ["Atlanta", "Augusta", "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs", "Roswell", "Johns Creek", "Albany"]
      },
      {
        code: "HI",
        name: "Hawaii",
        cities: ["Honolulu", "Pearl City", "Hilo", "Kailua", "Waipahu", "Kaneohe", "Kailua-Kona", "Kahului", "Lihue", "Mililani"]
      },
      {
        code: "ID",
        name: "Idaho",
        cities: ["Boise", "Meridian", "Nampa", "Idaho Falls", "Pocatello", "Caldwell", "Coeur d'Alene", "Twin Falls", "Lewiston", "Post Falls"]
      },
      {
        code: "IL",
        name: "Illinois",
        cities: ["Chicago", "Aurora", "Rockford", "Joliet", "Naperville", "Springfield", "Peoria", "Elgin", "Waukegan", "Cicero"]
      },
      {
        code: "IN",
        name: "Indiana",
        cities: ["Indianapolis", "Fort Wayne", "Evansville", "South Bend", "Carmel", "Fishers", "Bloomington", "Hammond", "Gary", "Muncie"]
      },
      {
        code: "IA",
        name: "Iowa",
        cities: ["Des Moines", "Cedar Rapids", "Davenport", "Sioux City", "Iowa City", "Waterloo", "Council Bluffs", "Ames", "Dubuque", "West Des Moines"]
      },
      {
        code: "KS",
        name: "Kansas",
        cities: ["Wichita", "Overland Park", "Kansas City", "Topeka", "Olathe", "Lawrence", "Shawnee", "Manhattan", "Lenexa", "Salina"]
      },
      {
        code: "KY",
        name: "Kentucky",
        cities: ["Louisville", "Lexington", "Bowling Green", "Owensboro", "Covington", "Richmond", "Georgetown", "Florence", "Hopkinsville", "Nicholasville"]
      },
      {
        code: "LA",
        name: "Louisiana",
        cities: ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "Lake Charles", "Kenner", "Bossier City", "Monroe", "Alexandria", "Houma"]
      },
      {
        code: "ME",
        name: "Maine",
        cities: ["Portland", "Lewiston", "Bangor", "South Portland", "Auburn", "Biddeford", "Sanford", "Saco", "Augusta", "Westbrook"]
      },
      {
        code: "MD",
        name: "Maryland",
        cities: ["Baltimore", "Frederick", "Rockville", "Gaithersburg", "Bowie", "Hagerstown", "Annapolis", "College Park", "Salisbury", "Laurel"]
      },
      {
        code: "MA",
        name: "Massachusetts",
        cities: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell", "Brockton", "Quincy", "Lynn", "Fall River", "Newton"]
      },
      {
        code: "MI",
        name: "Michigan",
        cities: ["Detroit", "Grand Rapids", "Warren", "Sterling Heights", "Lansing", "Ann Arbor", "Flint", "Dearborn", "Livonia", "Westland"]
      },
      {
        code: "MN",
        name: "Minnesota",
        cities: ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Bloomington", "Brooklyn Park", "Plymouth", "Woodbury", "Maple Grove", "Blaine"]
      },
      {
        code: "MS",
        name: "Mississippi",
        cities: ["Jackson", "Gulfport", "Southaven", "Hattiesburg", "Biloxi", "Meridian", "Tupelo", "Greenville", "Olive Branch", "Horn Lake"]
      },
      {
        code: "MO",
        name: "Missouri",
        cities: ["Kansas City", "St. Louis", "Springfield", "Independence", "Columbia", "Lee's Summit", "O'Fallon", "St. Joseph", "St. Charles", "St. Peters"]
      },
      {
        code: "MT",
        name: "Montana",
        cities: ["Billings", "Missoula", "Great Falls", "Bozeman", "Butte", "Helena", "Kalispell", "Havre", "Anaconda", "Miles City"]
      },
      {
        code: "NE",
        name: "Nebraska",
        cities: ["Omaha", "Lincoln", "Bellevue", "Grand Island", "Kearney", "Fremont", "Hastings", "North Platte", "Norfolk", "Columbus"]
      },
      {
        code: "NV",
        name: "Nevada",
        cities: ["Las Vegas", "Henderson", "Reno", "North Las Vegas", "Sparks", "Carson City", "Fernley", "Elko", "Mesquite", "Boulder City"]
      },
      {
        code: "NH",
        name: "New Hampshire",
        cities: ["Manchester", "Nashua", "Concord", "Derry", "Rochester", "Salem", "Dover", "Merrimack", "Londonderry", "Hudson"]
      },
      {
        code: "NJ",
        name: "New Jersey",
        cities: ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison", "Woodbridge", "Lakewood", "Toms River", "Hamilton", "Trenton"]
      },
      {
        code: "NM",
        name: "New Mexico",
        cities: ["Albuquerque", "Las Cruces", "Rio Rancho", "Santa Fe", "Roswell", "Farmington", "Clovis", "Hobbs", "Alamogordo", "Carlsbad"]
      },
      {
        code: "NY",
        name: "New York",
        cities: ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse", "Albany", "New Rochelle", "Mount Vernon", "Schenectady", "Utica"]
      },
      {
        code: "NC",
        name: "North Carolina",
        cities: ["Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem", "Fayetteville", "Cary", "Wilmington", "High Point", "Greenville"]
      },
      {
        code: "ND",
        name: "North Dakota",
        cities: ["Fargo", "Bismarck", "Grand Forks", "Minot", "West Fargo", "Williston", "Dickinson", "Mandan", "Jamestown", "Wahpeton"]
      },
      {
        code: "OH",
        name: "Ohio",
        cities: ["Columbus", "Cleveland", "Cincinnati", "Toledo", "Akron", "Dayton", "Parma", "Canton", "Youngstown", "Lorain"]
      },
      {
        code: "OK",
        name: "Oklahoma",
        cities: ["Oklahoma City", "Tulsa", "Norman", "Broken Arrow", "Lawton", "Edmond", "Moore", "Midwest City", "Enid", "Stillwater"]
      },
      {
        code: "OR",
        name: "Oregon",
        cities: ["Portland", "Eugene", "Salem", "Gresham", "Hillsboro", "Bend", "Beaverton", "Medford", "Springfield", "Corvallis"]
      },
      {
        code: "PA",
        name: "Pennsylvania",
        cities: ["Philadelphia", "Pittsburgh", "Allentown", "Erie", "Reading", "Scranton", "Bethlehem", "Lancaster", "Levittown", "Harrisburg"]
      },
      {
        code: "RI",
        name: "Rhode Island",
        cities: ["Providence", "Warwick", "Cranston", "Pawtucket", "East Providence", "Woonsocket", "Newport", "Central Falls", "Westerly", "North Providence"]
      },
      {
        code: "SC",
        name: "South Carolina",
        cities: ["Charleston", "Columbia", "North Charleston", "Mount Pleasant", "Rock Hill", "Greenville", "Summerville", "Sumter", "Goose Creek", "Hilton Head Island"]
      },
      {
        code: "SD",
        name: "South Dakota",
        cities: ["Sioux Falls", "Rapid City", "Aberdeen", "Brookings", "Watertown", "Mitchell", "Yankton", "Pierre", "Huron", "Spearfish"]
      },
      {
        code: "TN",
        name: "Tennessee",
        cities: ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Clarksville", "Murfreesboro", "Franklin", "Jackson", "Johnson City", "Bartlett"]
      },
      {
        code: "TX",
        name: "Texas",
        cities: ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Lubbock"]
      },
      {
        code: "UT",
        name: "Utah",
        cities: ["Salt Lake City", "West Valley City", "Provo", "West Jordan", "Orem", "Sandy", "Ogden", "St. George", "Layton", "Taylorsville"]
      },
      {
        code: "VT",
        name: "Vermont",
        cities: ["Burlington", "South Burlington", "Rutland", "Barre", "Montpelier", "Winooski", "St. Albans", "Newport", "Vergennes", "Brattleboro"]
      },
      {
        code: "VA",
        name: "Virginia",
        cities: ["Virginia Beach", "Norfolk", "Chesapeake", "Richmond", "Newport News", "Alexandria", "Hampton", "Portsmouth", "Suffolk", "Roanoke"]
      },
      {
        code: "WA",
        name: "Washington",
        cities: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue", "Kent", "Everett", "Renton", "Spokane Valley", "Federal Way"]
      },
      {
        code: "WV",
        name: "West Virginia",
        cities: ["Charleston", "Huntington", "Morgantown", "Parkersburg", "Wheeling", "Martinsburg", "Fairmont", "Beckley", "Clarksburg", "Lewisburg"]
      },
      {
        code: "WI",
        name: "Wisconsin",
        cities: ["Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton", "Waukesha", "Eau Claire", "Oshkosh", "Janesville"]
      },
      {
        code: "WY",
        name: "Wyoming",
        cities: ["Cheyenne", "Casper", "Laramie", "Gillette", "Rock Springs", "Sheridan", "Green River", "Evanston", "Riverton", "Jackson"]
      }
    ]
  },
  {
    code: "CA",
    name: "Canada",
    states: [
      {
        code: "AB",
        name: "Alberta",
        cities: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "St. Albert", "Medicine Hat", "Grande Prairie", "Airdrie", "Spruce Grove", "Okotoks"]
      },
      {
        code: "BC",
        name: "British Columbia",
        cities: ["Vancouver", "Surrey", "Burnaby", "Richmond", "Abbotsford", "Coquitlam", "Kelowna", "Saanich", "Delta", "Langley"]
      },
      {
        code: "MB",
        name: "Manitoba",
        cities: ["Winnipeg", "Brandon", "Steinbach", "Thompson", "Portage la Prairie", "Winkler", "Selkirk", "Morden", "Dauphin", "The Pas"]
      },
      {
        code: "NB",
        name: "New Brunswick",
        cities: ["Saint John", "Moncton", "Fredericton", "Dieppe", "Riverview", "Edmundston", "Campbellton", "Rothesay", "Bathurst", "Miramichi"]
      },
      {
        code: "NL",
        name: "Newfoundland and Labrador",
        cities: ["St. John's", "Mount Pearl", "Corner Brook", "Conception Bay South", "Paradise", "Grand Falls-Windsor", "Happy Valley-Goose Bay", "Gander", "Labrador City", "Stephenville"]
      },
      {
        code: "NS",
        name: "Nova Scotia",
        cities: ["Halifax", "Sydney", "Dartmouth", "Truro", "New Glasgow", "Glace Bay", "Yarmouth", "Bridgewater", "Kentville", "Amherst"]
      },
      {
        code: "ON",
        name: "Ontario",
        cities: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton", "London", "Markham", "Vaughan", "Kitchener", "Windsor"]
      },
      {
        code: "PE",
        name: "Prince Edward Island",
        cities: ["Charlottetown", "Summerside", "Stratford", "Cornwall", "Montague", "Kensington", "Souris", "Alberton", "Georgetown", "Tignish"]
      },
      {
        code: "QC",
        name: "Quebec",
        cities: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil", "Sherbrooke", "Saguenay", "Lévis", "Trois-Rivières", "Terrebonne"]
      },
      {
        code: "SK",
        name: "Saskatchewan",
        cities: ["Saskatoon", "Regina", "Prince Albert", "Moose Jaw", "Swift Current", "Yorkton", "North Battleford", "Estevan", "Weyburn", "Lloydminster"]
      },
      {
        code: "NT",
        name: "Northwest Territories",
        cities: ["Yellowknife", "Hay River", "Inuvik", "Fort Smith", "Behchokǫ̀", "Iqaluit", "Norman Wells", "Rankin Inlet", "Arviat", "Baker Lake"]
      },
      {
        code: "NU",
        name: "Nunavut",
        cities: ["Iqaluit", "Rankin Inlet", "Arviat", "Baker Lake", "Igloolik", "Pangnirtung", "Pond Inlet", "Cape Dorset", "Gjoa Haven", "Cambridge Bay"]
      },
      {
        code: "YT",
        name: "Yukon",
        cities: ["Whitehorse", "Dawson City", "Watson Lake", "Haines Junction", "Mayo", "Carmacks", "Faro", "Ross River", "Teslin", "Old Crow"]
      }
    ]
  },
  {
    code: "GB",
    name: "United Kingdom",
    states: [
      {
        code: "ENG",
        name: "England",
        cities: ["London", "Birmingham", "Leeds", "Glasgow", "Sheffield", "Bradford", "Liverpool", "Edinburgh", "Manchester", "Bristol"]
      },
      {
        code: "SCT",
        name: "Scotland",
        cities: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Stirling", "Perth", "Inverness", "Paisley", "East Kilbride", "Livingston"]
      },
      {
        code: "WLS",
        name: "Wales",
        cities: ["Cardiff", "Swansea", "Newport", "Wrexham", "Barry", "Caerphilly", "Bridgend", "Neath", "Port Talbot", "Cwmbran"]
      },
      {
        code: "NIR",
        name: "Northern Ireland",
        cities: ["Belfast", "Derry", "Lisburn", "Newtownabbey", "Bangor", "Craigavon", "Castlereagh", "Ballymena", "Newtownards", "Carrickfergus"]
      }
    ]
  },
  {
    code: "AU",
    name: "Australia",
    states: [
      {
        code: "NSW",
        name: "New South Wales",
        cities: ["Sydney", "Newcastle", "Wollongong", "Maitland", "Wagga Wagga", "Albury", "Port Macquarie", "Tamworth", "Orange", "Dubbo"]
      },
      {
        code: "VIC",
        name: "Victoria",
        cities: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Frankston", "Melton", "Casey", "Monash", "Latrobe", "Greater Dandenong"]
      },
      {
        code: "QLD",
        name: "Queensland",
        cities: ["Brisbane", "Gold Coast", "Townsville", "Cairns", "Toowoomba", "Rockingham", "Mackay", "Bundaberg", "Rockhampton", "Hervey Bay"]
      },
      {
        code: "WA",
        name: "Western Australia",
        cities: ["Perth", "Fremantle", "Rockingham", "Mandurah", "Bunbury", "Kalgoorlie", "Geraldton", "Albany", "Broome", "Port Hedland"]
      },
      {
        code: "SA",
        name: "South Australia",
        cities: ["Adelaide", "Mount Gambier", "Whyalla", "Murray Bridge", "Port Augusta", "Port Pirie", "Victor Harbor", "Gawler", "Port Lincoln", "Kadina"]
      },
      {
        code: "TAS",
        name: "Tasmania",
        cities: ["Hobart", "Launceston", "Devonport", "Burnie", "Somerset", "Glenorchy", "Clarence", "Kingborough", "Waratah-Wynyard", "West Tamar"]
      },
      {
        code: "ACT",
        name: "Australian Capital Territory",
        cities: ["Canberra", "Gungahlin", "Tuggeranong", "Weston Creek", "Belconnen", "Inner South", "Inner North", "Woden Valley", "Molonglo Valley", "Kowen"]
      },
      {
        code: "NT",
        name: "Northern Territory",
        cities: ["Darwin", "Alice Springs", "Palmerston", "Katherine", "Tennant Creek", "Nhulunbuy", "Casuarina", "Jabiru", "Yulara", "Alyangula"]
      }
    ]
  },
  {
    code: "DE",
    name: "Germany",
    states: [
      {
        code: "BW",
        name: "Baden-Württemberg",
        cities: ["Stuttgart", "Mannheim", "Karlsruhe", "Freiburg", "Heidelberg", "Heilbronn", "Ulm", "Pforzheim", "Reutlingen", "Esslingen"]
      },
      {
        code: "BY",
        name: "Bavaria",
        cities: ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Würzburg", "Ingolstadt", "Fürth", "Erlangen", "Bayreuth", "Bamberg"]
      },
      {
        code: "BE",
        name: "Berlin",
        cities: ["Berlin"]
      },
      {
        code: "BB",
        name: "Brandenburg",
        cities: ["Potsdam", "Cottbus", "Brandenburg", "Frankfurt (Oder)", "Oranienburg", "Falkensee", "Königs Wusterhausen", "Eberswalde", "Eisenhüttenstadt", "Rathenow"]
      },
      {
        code: "HB",
        name: "Bremen",
        cities: ["Bremen", "Bremerhaven"]
      },
      {
        code: "HH",
        name: "Hamburg",
        cities: ["Hamburg"]
      },
      {
        code: "HE",
        name: "Hesse",
        cities: ["Frankfurt am Main", "Wiesbaden", "Kassel", "Darmstadt", "Offenbach", "Hanau", "Marburg", "Fulda", "Rüsselsheim", "Gießen"]
      },
      {
        code: "MV",
        name: "Mecklenburg-Vorpommern",
        cities: ["Schwerin", "Rostock", "Neubrandenburg", "Stralsund", "Greifswald", "Wismar", "Güstrow", "Waren", "Neustrelitz", "Bergen"]
      },
      {
        code: "NI",
        name: "Lower Saxony",
        cities: ["Hannover", "Braunschweig", "Oldenburg", "Osnabrück", "Wolfsburg", "Göttingen", "Salzgitter", "Hildesheim", "Delmenhorst", "Wilhelmshaven"]
      },
      {
        code: "NW",
        name: "North Rhine-Westphalia",
        cities: ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster"]
      },
      {
        code: "RP",
        name: "Rhineland-Palatinate",
        cities: ["Mainz", "Ludwigshafen", "Koblenz", "Trier", "Kaiserslautern", "Worms", "Neuwied", "Speyer", "Frankenthal", "Neustadt"]
      },
      {
        code: "SL",
        name: "Saarland",
        cities: ["Saarbrücken", "Neunkirchen", "Homburg", "Völklingen", "St. Ingbert", "Merzig", "St. Wendel", "Blieskastel", "Lebach", "Dillingen"]
      },
      {
        code: "SN",
        name: "Saxony",
        cities: ["Dresden", "Leipzig", "Chemnitz", "Zwickau", "Plauen", "Görlitz", "Freiberg", "Bautzen", "Pirna", "Hoyerswerda"]
      },
      {
        code: "ST",
        name: "Saxony-Anhalt",
        cities: ["Magdeburg", "Halle", "Dessau-Roßlau", "Wittenberg", "Stendal", "Weißenfels", "Merseburg", "Bernburg", "Naumburg", "Zeitz"]
      },
      {
        code: "SH",
        name: "Schleswig-Holstein",
        cities: ["Kiel", "Lübeck", "Flensburg", "Neumünster", "Norderstedt", "Elmshorn", "Pinneberg", "Wedel", "Ahrensburg", "Geesthacht"]
      },
      {
        code: "TH",
        name: "Thuringia",
        cities: ["Erfurt", "Jena", "Gera", "Weimar", "Gotha", "Nordhausen", "Eisenach", "Suhl", "Mühlhausen", "Altenburg"]
      }
    ]
  },
  {
    code: "FR",
    name: "France",
    states: [
      {
        code: "IDF",
        name: "Île-de-France",
        cities: ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Argenteuil", "Versailles", "Montreuil", "Créteil", "Nanterre", "Courbevoie", "Colombes"]
      },
      {
        code: "ARA",
        name: "Auvergne-Rhône-Alpes",
        cities: ["Lyon", "Saint-Étienne", "Grenoble", "Villeurbanne", "Clermont-Ferrand", "Valence", "Chambéry", "Annecy", "Bourg-en-Bresse", "Roanne"]
      },
      {
        code: "HDF",
        name: "Hauts-de-France",
        cities: ["Lille", "Amiens", "Roubaix", "Tourcoing", "Calais", "Dunkerque", "Villeneuve-d'Ascq", "Valenciennes", "Boulogne-sur-Mer", "Arras"]
      },
      {
        code: "OCC",
        name: "Occitanie",
        cities: ["Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers", "Narbonne", "Carcassonne", "Albi", "Tarbes", "Bayonne"]
      },
      {
        code: "NAQ",
        name: "Nouvelle-Aquitaine",
        cities: ["Bordeaux", "Limoges", "Poitiers", "Pau", "La Rochelle", "Mérignac", "Pessac", "Bayonne", "Angoulême", "Niort"]
      },
      {
        code: "GES",
        name: "Grand Est",
        cities: ["Strasbourg", "Reims", "Metz", "Nancy", "Mulhouse", "Troyes", "Charleville-Mézières", "Colmar", "Châlons-en-Champagne", "Thionville"]
      },
      {
        code: "PDL",
        name: "Pays de la Loire",
        cities: ["Nantes", "Angers", "Le Mans", "Saint-Nazaire", "Cholet", "Laval", "Rezé", "Saint-Sébastien-sur-Loire", "La Roche-sur-Yon", "Saumur"]
      },
      {
        code: "BRE",
        name: "Brittany",
        cities: ["Rennes", "Brest", "Quimper", "Lorient", "Vannes", "Saint-Malo", "Saint-Brieuc", "Lanester", "Fougères", "Lannion"]
      },
      {
        code: "NOR",
        name: "Normandy",
        cities: ["Le Havre", "Rouen", "Caen", "Cherbourg-en-Cotentin", "Évreux", "Dieppe", "Sotteville-lès-Rouen", "Saint-Étienne-du-Rouvray", "Alençon", "Lisieux"]
      },
      {
        code: "CVL",
        name: "Centre-Val de Loire",
        cities: ["Orléans", "Tours", "Bourges", "Blois", "Chartres", "Châteauroux", "Joué-lès-Tours", "Dreux", "Vierzon", "Fleury-les-Aubrais"]
      },
      {
        code: "BFC",
        name: "Bourgogne-Franche-Comté",
        cities: ["Dijon", "Besançon", "Belfort", "Chalon-sur-Saône", "Nevers", "Auxerre", "Mâcon", "Montbéliard", "Sens", "Le Creusot"]
      },
      {
        code: "PAC",
        name: "Provence-Alpes-Côte d'Azur",
        cities: ["Marseille", "Nice", "Toulon", "Aix-en-Provence", "Antibes", "Cannes", "Avignon", "Fréjus", "Arles", "Gap"]
      },
      {
        code: "COR",
        name: "Corsica",
        cities: ["Ajaccio", "Bastia", "Porto-Vecchio", "Corte", "Bonifacio", "Calvi", "Propriano", "Sartène", "Ghisonaccia", "Saint-Florent"]
      }
    ]
  }
];

export function getCountryByCode(code: string): Country | undefined {
  return LOCATION_DATA.find(country => country.code === code);
}

export function getStatesByCountry(countryCode: string): State[] {
  const country = getCountryByCode(countryCode);
  return country?.states || [];
}

export function getCitiesByState(countryCode: string, stateCode: string): string[] {
  const states = getStatesByCountry(countryCode);
  const state = states.find(s => s.code === stateCode);
  return state?.cities || [];
}

export function getStateByCode(countryCode: string, stateCode: string): State | undefined {
  const states = getStatesByCountry(countryCode);
  return states.find(s => s.code === stateCode);
}