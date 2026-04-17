import {
  AstroTime,
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  Observer,
  RotateVector,
  Rotation_HOR_ECL,
  SunPosition,
  SphereFromVector,
  Vector,
} from 'astronomy-engine';
import { CITY_OPTIONS } from './generatedCityRegistry';

const SIGN_CODES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SIGN_LABELS = {
  aries: '白羊',
  taurus: '金牛',
  gemini: '双子',
  cancer: '巨蟹',
  leo: '狮子',
  virgo: '处女',
  libra: '天秤',
  scorpio: '天蝎',
  sagittarius: '射手',
  capricorn: '摩羯',
  aquarius: '水瓶',
  pisces: '双鱼',
};

const ELEMENT_BY_SIGN = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

const PLANET_DEFS = [
  { code: 'SUN', label: '太阳', body: Body.Sun, symbol: '☉', color: '#f4a623' },
  { code: 'MOON', label: '月亮', body: Body.Moon, symbol: '☽', color: '#7c8cf5' },
  { code: 'MERCURY', label: '水星', body: Body.Mercury, symbol: '☿', color: '#35a77a' },
  { code: 'VENUS', label: '金星', body: Body.Venus, symbol: '♀', color: '#d86cb3' },
  { code: 'MARS', label: '火星', body: Body.Mars, symbol: '♂', color: '#ea5a47' },
  { code: 'JUPITER', label: '木星', body: Body.Jupiter, symbol: '♃', color: '#d9a441' },
  { code: 'SATURN', label: '土星', body: Body.Saturn, symbol: '♄', color: '#82715d' },
  { code: 'URANUS', label: '天王星', body: Body.Uranus, symbol: '♅', color: '#34b7cc' },
  { code: 'NEPTUNE', label: '海王星', body: Body.Neptune, symbol: '♆', color: '#5976f4' },
  { code: 'PLUTO', label: '冥王星', body: Body.Pluto, symbol: '♇', color: '#6f4f9f' },
];

const ASPECT_RULES = [
  { type: 'conjunction', angle: 0, orb: 8, label: '合相' },
  { type: 'sextile', angle: 60, orb: 4, label: '六合' },
  { type: 'square', angle: 90, orb: 6, label: '刑相' },
  { type: 'trine', angle: 120, orb: 6, label: '拱相' },
  { type: 'opposition', angle: 180, orb: 8, label: '对冲' },
];

export const CALCULATION_ENGINE_INFO = {
  id: 'astronomy-engine',
  version: '2.1.19',
  license: 'MIT',
  author: 'Don Cross',
  runtimes: ['JavaScript', 'TypeScript', 'Python', 'C#'],
  summary: 'Active western chart engine for MingSky web results.',
};

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(value) {
  let next = value % 360;
  if (next < 0) next += 360;
  return next;
}

function longitudeDistance(left, right) {
  const delta = Math.abs(normalizeLongitude(left) - normalizeLongitude(right));
  return delta > 180 ? 360 - delta : delta;
}

function signedLongitudeDelta(left, right) {
  let delta = normalizeLongitude(right) - normalizeLongitude(left);
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function getSignFromLongitude(longitude) {
  const normalized = normalizeLongitude(longitude);
  const index = Math.floor(normalized / 30) % 12;
  return {
    code: SIGN_CODES[index],
    label: SIGN_LABELS[SIGN_CODES[index]],
    degree: normalized % 30,
    index,
  };
}

function formatDegree(value) {
  const degree = Math.floor(value);
  const minute = Math.floor((value - degree) * 60);
  return `${degree}°${String(minute).padStart(2, '0')}`;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const utcEquivalent = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((utcEquivalent - date.getTime()) / 60000);
}

function zonedDateTimeToUtc(dateString, timeString, timeZone) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = timeString.split(':').map(Number);
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let index = 0; index < 4; index += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
    const refined = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60000);
    if (Math.abs(refined.getTime() - guess.getTime()) < 1000) return refined;
    guess = refined;
  }
  return guess;
}

function getCityByKey(cityKey) {
  return CITY_OPTIONS.find((city) => city.key === cityKey) || CITY_OPTIONS[0];
}

function calculateAscendantLongitude(date, observer) {
  const time = new AstroTime(date);
  const rotation = Rotation_HOR_ECL(time, observer);
  const eastVector = new Vector(0, -1, 0, time);
  const eclipticVector = RotateVector(rotation, eastVector);
  const sphere = SphereFromVector(eclipticVector);
  return normalizeLongitude(sphere.lon);
}

function getWholeSignHouseNumber(planetLongitude, ascLongitude) {
  const planetSign = getSignFromLongitude(planetLongitude).index;
  const ascSign = getSignFromLongitude(ascLongitude).index;
  return ((planetSign - ascSign + 12) % 12) + 1;
}

function buildHouseSigns(ascLongitude) {
  const ascSign = getSignFromLongitude(ascLongitude).index;
  return Array.from({ length: 12 }, (_, index) => {
    const signIndex = (ascSign + index) % 12;
    return {
      houseNumber: index + 1,
      sign: SIGN_CODES[signIndex],
      signLabel: SIGN_LABELS[SIGN_CODES[signIndex]],
      longitude: normalizeLongitude(signIndex * 30),
    };
  });
}

function getGeocentricLongitude(body, date) {
  if (body === Body.Sun) {
    return normalizeLongitude(SunPosition(date).elon);
  }
  if (body === Body.Moon) {
    return normalizeLongitude(EclipticGeoMoon(date).lon);
  }
  return normalizeLongitude(Ecliptic(GeoVector(body, date, true)).elon);
}

function buildPlanetPositions(date, ascLongitude) {
  return PLANET_DEFS.map((planet) => {
    const longitude = getGeocentricLongitude(planet.body, date);
    const longitudeTomorrow = getGeocentricLongitude(planet.body, new Date(date.getTime() + 86400000));
    const signedDelta = signedLongitudeDelta(longitude, longitudeTomorrow);
    const sign = getSignFromLongitude(longitude);
    return {
      code: planet.code,
      label: planet.label,
      symbol: planet.symbol,
      color: planet.color,
      longitude,
      sign: sign.code,
      signLabel: sign.label,
      signDegree: sign.degree,
      degreeText: formatDegree(sign.degree),
      houseNumber: getWholeSignHouseNumber(longitude, ascLongitude),
      motion: Math.abs(signedDelta) < 0.01 ? 'stationary' : signedDelta < 0 ? 'retrograde' : 'direct',
    };
  });
}

function buildAspectList(planets) {
  const aspects = [];
  for (let left = 0; left < planets.length; left += 1) {
    for (let right = left + 1; right < planets.length; right += 1) {
      const delta = longitudeDistance(planets[left].longitude, planets[right].longitude);
      const match = ASPECT_RULES.find((rule) => Math.abs(delta - rule.angle) <= rule.orb);
      if (!match) continue;
      const orb = Math.abs(delta - match.angle);
      aspects.push({
        code: `${planets[left].code}_${match.type.toUpperCase()}_${planets[right].code}`,
        type: match.type,
        label: match.label,
        left: planets[left],
        right: planets[right],
        orb,
        strengthScore: Number(clampValue(1 - orb / match.orb, 0.35, 1).toFixed(2)),
      });
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 12);
}

function buildDerivedMetrics(planets, ascSignCode) {
  const relevantPoints = planets.filter((planet) => ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN'].includes(planet.code));
  const elementScores = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const point of [...relevantPoints, { sign: ascSignCode }]) {
    const element = ELEMENT_BY_SIGN[point.sign];
    elementScores[element] += 1;
  }

  const total = Object.values(elementScores).reduce((sum, value) => sum + value, 0) || 1;
  const dominantElement = Object.entries(elementScores).sort((left, right) => right[1] - left[1])[0][0];
  const angularCount = planets.filter((planet) => [1, 4, 7, 10].includes(planet.houseNumber)).length;

  const planetScores = planets.map((planet) => ({
    code: planet.code,
    score: ([1, 4, 7, 10].includes(planet.houseNumber) ? 1.2 : 0.75) + (planet.code === 'SUN' || planet.code === 'MOON' ? 0.35 : 0),
  }));
  const dominantPlanet = planetScores.sort((left, right) => right.score - left.score)[0]?.code || 'SUN';

  return [
    { metric_code: 'ELEMENT_FIRE_SCORE', value: Number((elementScores.fire / total).toFixed(2)) },
    { metric_code: 'ELEMENT_EARTH_SCORE', value: Number((elementScores.earth / total).toFixed(2)) },
    { metric_code: 'ELEMENT_AIR_SCORE', value: Number((elementScores.air / total).toFixed(2)) },
    { metric_code: 'ELEMENT_WATER_SCORE', value: Number((elementScores.water / total).toFixed(2)) },
    { metric_code: 'DOMINANT_ELEMENT', value: dominantElement.toUpperCase() },
    { metric_code: 'DOMINANT_PLANET', value: dominantPlanet },
    { metric_code: 'ANGULAR_HOUSE_SCORE', value: Number((angularCount / planets.length).toFixed(2)) },
  ];
}

function buildPatternFacts(planets) {
  const signBuckets = new Map();
  for (const planet of planets) {
    const bucket = signBuckets.get(planet.sign) || [];
    bucket.push(planet.code);
    signBuckets.set(planet.sign, bucket);
  }
  const stellium = [...signBuckets.values()].find((bucket) => bucket.length >= 3);
  if (!stellium) return [];
  return [{ pattern_code: 'STELLIUM', value: stellium }];
}

function pointFact(factId, planet) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${planet.code.toLowerCase()}`,
    fact_type: 'point',
    qualifiers: {
      point_code: planet.code,
      sign: planet.sign,
      house_number: planet.houseNumber,
      motion: planet.motion,
      longitude_deg: Number(planet.longitude.toFixed(4)),
      sign_degree: Number(planet.signDegree.toFixed(4)),
    },
    confidence: 0.98,
  };
}

function houseFact(factId, house) {
  return {
    fact_id: factId,
    fact_code: `${factId}_house_${house.houseNumber}`,
    fact_type: 'house',
    qualifiers: {
      house_number: house.houseNumber,
      sign: house.sign,
      cusp_longitude_deg: Number(house.longitude.toFixed(4)),
    },
    confidence: 0.96,
  };
}

function aspectFact(factId, aspect) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${aspect.code.toLowerCase()}`,
    fact_type: 'aspect',
    qualifiers: {
      point_a_code: aspect.left.code,
      point_b_code: aspect.right.code,
      aspect_type: aspect.type,
      orb_deg: Number(aspect.orb.toFixed(2)),
      strength_score: aspect.strengthScore,
      exact: aspect.orb <= 1,
    },
    confidence: 0.92,
  };
}

function metricFact(factId, metric) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${metric.metric_code.toLowerCase()}`,
    fact_type: 'derived_metric',
    qualifiers: {
      metric_code: metric.metric_code,
    },
    value: metric.value,
    confidence: 0.9,
  };
}

function patternFact(factId, pattern) {
  return {
    fact_id: factId,
    fact_code: `${factId}_${pattern.pattern_code.toLowerCase()}`,
    fact_type: 'pattern',
    qualifiers: {
      pattern_code: pattern.pattern_code,
    },
    value: pattern.value,
    confidence: 0.88,
  };
}

export function calculateWesternNatalChart(input) {
  const city = getCityByKey(input.cityKey);
  const utcDate = zonedDateTimeToUtc(input.birthDate, input.birthTime, city.timezone);
  const observer = new Observer(city.latitude, city.longitude, 0);
  const ascLongitude = calculateAscendantLongitude(utcDate, observer);
  const ascSign = getSignFromLongitude(ascLongitude);
  const houses = buildHouseSigns(ascLongitude);
  const planets = buildPlanetPositions(utcDate, ascLongitude);
  const aspects = buildAspectList(planets);
  const metrics = buildDerivedMetrics(planets, ascSign.code);
  const patterns = buildPatternFacts(planets);

  const westernFacts = [
    ...planets.map((planet, index) => pointFact(`p${index + 1}`, planet)),
    pointFact('p_asc', {
      code: 'ASC',
      sign: ascSign.code,
      houseNumber: 1,
      motion: 'direct',
      longitude: ascLongitude,
      signDegree: ascSign.degree,
    }),
    ...houses.map((house) => houseFact(`h${house.houseNumber}`, house)),
    ...aspects.map((aspect, index) => aspectFact(`a${index + 1}`, aspect)),
    ...metrics.map((metric, index) => metricFact(`m${index + 1}`, metric)),
    ...patterns.map((pattern, index) => patternFact(`pt${index + 1}`, pattern)),
  ];

  return {
    chart_id: `western-${utcDate.getTime()}-${city.key}`,
    chart_type: 'natal',
    subjects: [{ subject_id: 'web-user', birth_input: { time_accuracy: 'exact' } }],
    systems: [
      {
        system_code: 'western',
        confidence: { overall: 0.97, houses: 0.88, aspects: 0.92 },
        facts: westernFacts,
      },
    ],
    visual: {
      utcDate,
      city,
      observer,
      ascLongitude,
      ascSign,
      houses,
      planets,
      aspects,
      metrics,
    },
  };
}
