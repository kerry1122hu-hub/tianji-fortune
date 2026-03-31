import citiesData from '../i18n/cities.json';

const SUPPLEMENTAL_MAINLAND = {
  '河北省': [
    { city: '邯郸', lat: 36.6256, lon: 114.5391, tz: 'Asia/Shanghai' },
    { city: '邢台', lat: 37.0706, lon: 114.5048, tz: 'Asia/Shanghai' },
    { city: '承德', lat: 40.9515, lon: 117.9627, tz: 'Asia/Shanghai' },
    { city: '衡水', lat: 37.7389, lon: 115.6705, tz: 'Asia/Shanghai' },
  ],
  '江苏省': [
    { city: '连云港', lat: 34.5967, lon: 119.2216, tz: 'Asia/Shanghai' },
    { city: '淮安', lat: 33.6104, lon: 119.0153, tz: 'Asia/Shanghai' },
    { city: '盐城', lat: 33.3495, lon: 120.1636, tz: 'Asia/Shanghai' },
    { city: '宿迁', lat: 33.9630, lon: 118.2755, tz: 'Asia/Shanghai' },
    { city: '泰州', lat: 32.4555, lon: 119.9255, tz: 'Asia/Shanghai' },
  ],
  '浙江省': [
    { city: '湖州', lat: 30.8943, lon: 120.0868, tz: 'Asia/Shanghai' },
    { city: '舟山', lat: 29.9853, lon: 122.2072, tz: 'Asia/Shanghai' },
    { city: '衢州', lat: 28.9359, lon: 118.8742, tz: 'Asia/Shanghai' },
    { city: '丽水', lat: 28.4676, lon: 119.9229, tz: 'Asia/Shanghai' },
  ],
  '安徽省': [
    { city: '马鞍山', lat: 31.6705, lon: 118.5061, tz: 'Asia/Shanghai' },
    { city: '铜陵', lat: 30.9454, lon: 117.8121, tz: 'Asia/Shanghai' },
    { city: '滁州', lat: 32.3018, lon: 118.3163, tz: 'Asia/Shanghai' },
    { city: '六安', lat: 31.7337, lon: 116.5232, tz: 'Asia/Shanghai' },
    { city: '亳州', lat: 33.8446, lon: 115.7786, tz: 'Asia/Shanghai' },
  ],
  '福建省': [
    { city: '莆田', lat: 25.4540, lon: 119.0076, tz: 'Asia/Shanghai' },
    { city: '三明', lat: 26.2639, lon: 117.6392, tz: 'Asia/Shanghai' },
    { city: '南平', lat: 27.3319, lon: 118.1204, tz: 'Asia/Shanghai' },
    { city: '龙岩', lat: 25.0751, lon: 117.0173, tz: 'Asia/Shanghai' },
    { city: '宁德', lat: 26.6657, lon: 119.5479, tz: 'Asia/Shanghai' },
  ],
  '江西省': [
    { city: '景德镇', lat: 29.2689, lon: 117.1784, tz: 'Asia/Shanghai' },
    { city: '萍乡', lat: 27.6229, lon: 113.8543, tz: 'Asia/Shanghai' },
    { city: '新余', lat: 27.8178, lon: 114.9171, tz: 'Asia/Shanghai' },
    { city: '鹰潭', lat: 28.2602, lon: 117.0692, tz: 'Asia/Shanghai' },
    { city: '吉安', lat: 27.1138, lon: 114.9920, tz: 'Asia/Shanghai' },
    { city: '宜春', lat: 27.8150, lon: 114.4165, tz: 'Asia/Shanghai' },
    { city: '抚州', lat: 27.9839, lon: 116.3584, tz: 'Asia/Shanghai' },
    { city: '上饶', lat: 28.4549, lon: 117.9434, tz: 'Asia/Shanghai' },
  ],
  '山东省': [
    { city: '枣庄', lat: 34.8107, lon: 117.3230, tz: 'Asia/Shanghai' },
    { city: '东营', lat: 37.4346, lon: 118.6747, tz: 'Asia/Shanghai' },
    { city: '日照', lat: 35.4164, lon: 119.5269, tz: 'Asia/Shanghai' },
    { city: '德州', lat: 37.4341, lon: 116.3575, tz: 'Asia/Shanghai' },
    { city: '聊城', lat: 36.4570, lon: 115.9855, tz: 'Asia/Shanghai' },
    { city: '滨州', lat: 37.3826, lon: 117.9728, tz: 'Asia/Shanghai' },
  ],
  '河南省': [
    { city: '平顶山', lat: 33.7661, lon: 113.1927, tz: 'Asia/Shanghai' },
    { city: '安阳', lat: 36.0976, lon: 114.3924, tz: 'Asia/Shanghai' },
    { city: '鹤壁', lat: 35.7472, lon: 114.2974, tz: 'Asia/Shanghai' },
    { city: '焦作', lat: 35.2159, lon: 113.2418, tz: 'Asia/Shanghai' },
    { city: '濮阳', lat: 35.7618, lon: 115.0292, tz: 'Asia/Shanghai' },
    { city: '漯河', lat: 33.5815, lon: 114.0168, tz: 'Asia/Shanghai' },
    { city: '三门峡', lat: 34.7725, lon: 111.2003, tz: 'Asia/Shanghai' },
    { city: '商丘', lat: 34.4154, lon: 115.6563, tz: 'Asia/Shanghai' },
    { city: '信阳', lat: 32.1460, lon: 114.0928, tz: 'Asia/Shanghai' },
    { city: '周口', lat: 33.6250, lon: 114.6969, tz: 'Asia/Shanghai' },
    { city: '驻马店', lat: 32.9802, lon: 114.0285, tz: 'Asia/Shanghai' },
  ],
  '湖北省': [
    { city: '黄石', lat: 30.1997, lon: 115.0389, tz: 'Asia/Shanghai' },
    { city: '十堰', lat: 32.6294, lon: 110.7989, tz: 'Asia/Shanghai' },
    { city: '鄂州', lat: 30.3919, lon: 114.8948, tz: 'Asia/Shanghai' },
    { city: '孝感', lat: 30.9248, lon: 113.9169, tz: 'Asia/Shanghai' },
    { city: '黄冈', lat: 30.4537, lon: 114.8724, tz: 'Asia/Shanghai' },
    { city: '咸宁', lat: 29.8413, lon: 114.3224, tz: 'Asia/Shanghai' },
  ],
  '湖南省': [
    { city: '湘潭', lat: 27.8297, lon: 112.9454, tz: 'Asia/Shanghai' },
    { city: '邵阳', lat: 27.2389, lon: 111.4677, tz: 'Asia/Shanghai' },
    { city: '郴州', lat: 25.7705, lon: 113.0155, tz: 'Asia/Shanghai' },
    { city: '永州', lat: 26.4203, lon: 111.6131, tz: 'Asia/Shanghai' },
    { city: '怀化', lat: 27.5697, lon: 110.0016, tz: 'Asia/Shanghai' },
    { city: '娄底', lat: 27.7281, lon: 111.9945, tz: 'Asia/Shanghai' },
  ],
  '广东省': [
    { city: '韶关', lat: 24.8104, lon: 113.5972, tz: 'Asia/Shanghai' },
    { city: '江门', lat: 22.5787, lon: 113.0816, tz: 'Asia/Shanghai' },
    { city: '茂名', lat: 21.6633, lon: 110.9252, tz: 'Asia/Shanghai' },
    { city: '肇庆', lat: 23.0472, lon: 112.4651, tz: 'Asia/Shanghai' },
    { city: '梅州', lat: 24.2991, lon: 116.1226, tz: 'Asia/Shanghai' },
    { city: '汕尾', lat: 22.7862, lon: 115.3753, tz: 'Asia/Shanghai' },
    { city: '河源', lat: 23.7437, lon: 114.7004, tz: 'Asia/Shanghai' },
    { city: '阳江', lat: 21.8579, lon: 111.9826, tz: 'Asia/Shanghai' },
    { city: '清远', lat: 23.6820, lon: 113.0560, tz: 'Asia/Shanghai' },
    { city: '潮州', lat: 23.6617, lon: 116.6225, tz: 'Asia/Shanghai' },
    { city: '揭阳', lat: 23.5497, lon: 116.3728, tz: 'Asia/Shanghai' },
    { city: '云浮', lat: 22.9153, lon: 112.0445, tz: 'Asia/Shanghai' },
  ],
  '广西壮族自治区': [
    { city: '梧州', lat: 23.4769, lon: 111.2791, tz: 'Asia/Shanghai' },
    { city: '防城港', lat: 21.6146, lon: 108.3547, tz: 'Asia/Shanghai' },
    { city: '钦州', lat: 21.9797, lon: 108.6544, tz: 'Asia/Shanghai' },
    { city: '贵港', lat: 23.1131, lon: 109.5989, tz: 'Asia/Shanghai' },
    { city: '玉林', lat: 22.6545, lon: 110.1809, tz: 'Asia/Shanghai' },
  ],
  '四川省': [
    { city: '自贡', lat: 29.3392, lon: 104.7784, tz: 'Asia/Shanghai' },
    { city: '攀枝花', lat: 26.5823, lon: 101.7186, tz: 'Asia/Shanghai' },
    { city: '德阳', lat: 31.1268, lon: 104.3979, tz: 'Asia/Shanghai' },
    { city: '广元', lat: 32.4337, lon: 105.8434, tz: 'Asia/Shanghai' },
    { city: '遂宁', lat: 30.5328, lon: 105.5929, tz: 'Asia/Shanghai' },
    { city: '内江', lat: 29.5802, lon: 105.0584, tz: 'Asia/Shanghai' },
    { city: '乐山', lat: 29.5521, lon: 103.7655, tz: 'Asia/Shanghai' },
    { city: '达州', lat: 31.2080, lon: 107.4678, tz: 'Asia/Shanghai' },
    { city: '眉山', lat: 30.0754, lon: 103.8485, tz: 'Asia/Shanghai' },
  ],
  '陕西省': [
    { city: '铜川', lat: 34.8967, lon: 108.9451, tz: 'Asia/Shanghai' },
    { city: '渭南', lat: 34.4999, lon: 109.5102, tz: 'Asia/Shanghai' },
    { city: '榆林', lat: 38.2858, lon: 109.7341, tz: 'Asia/Shanghai' },
    { city: '安康', lat: 32.6849, lon: 109.0293, tz: 'Asia/Shanghai' },
    { city: '商洛', lat: 33.8683, lon: 109.9404, tz: 'Asia/Shanghai' },
  ],
};

const SHORT_NAME_REPLACERS = [
  ['壮族自治区', ''],
  ['维吾尔自治区', ''],
  ['回族自治区', ''],
  ['自治区', ''],
  ['省', ''],
  ['市', ''],
];

const mergeMainlandCities = () => {
  const mainland = {};

  Object.entries(citiesData.mainland).forEach(([province, cities]) => {
    mainland[province] = [...cities];
  });

  Object.entries(SUPPLEMENTAL_MAINLAND).forEach(([province, cities]) => {
    const existing = mainland[province] || [];
    const existingNames = new Set(existing.map((item) => item.city));
    mainland[province] = [...existing];

    cities.forEach((city) => {
      if (!existingNames.has(city.city)) {
        mainland[province].push(city);
      }
    });
  });

  return mainland;
};

const MAINLAND_CITIES = mergeMainlandCities();

const getShortProvinceName = (province) => SHORT_NAME_REPLACERS.reduce(
  (name, [target, replacement]) => name.replace(target, replacement),
  province,
);

const buildCityMap = () => {
  const map = {};

  Object.entries(MAINLAND_CITIES).forEach(([, cities]) => {
    cities.forEach((city) => {
      map[city.city] = { lng: city.lon, lat: city.lat, tz: 8 };
    });
  });

  Object.entries(citiesData.global).forEach(([, cities]) => {
    cities.forEach((city) => {
      map[city.city] = { lng: city.lon, lat: city.lat, tz: 8 };
    });
  });

  return map;
};

export const CHINA_CITIES = buildCityMap();

export const getCityList = () => {
  const result = {};

  Object.entries(MAINLAND_CITIES).forEach(([province, cities]) => {
    result[getShortProvinceName(province)] = cities.map((city) => city.city);
  });

  result['海外'] = [];
  Object.entries(citiesData.global).forEach(([, cities]) => {
    cities.forEach((city) => result['海外'].push(city.city));
  });

  return result;
};
