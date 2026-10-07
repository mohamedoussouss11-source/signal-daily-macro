/* Approximate common-food portions and nutrients. Values are per 100 g. */
(function (root) {
  'use strict';

  const foods = [
    { aliases: ['egg whites', 'egg white'], serving: 33, units: { piece: 33 }, p: 10.9, c: 0.7, f: 0.2, kcal: 52 },
    { aliases: ['eggs', 'egg'], serving: 50, units: { piece: 50 }, p: 12.6, c: 0.7, f: 9.5, kcal: 144 },
    { aliases: ['rolled oats', 'oatmeal', 'oats'], serving: 234, units: { cup: 234, bowl: 300, scoop: 80, tbsp: 15 }, p: 2.5, c: 12, f: 1.5, kcal: 71,
      dry: { serving: 40, units: { cup: 80, bowl: 120, scoop: 30, tbsp: 5 }, p: 16.9, c: 66.3, f: 6.9, kcal: 389 } },
    { aliases: ['bananas', 'banana'], serving: 118, sizes: { small: 90, medium: 118, large: 140 }, units: { piece: 118, cup: 150 }, p: 1.1, c: 22.8, f: 0.3, kcal: 89 },
    { aliases: ['apples', 'apple'], serving: 180, sizes: { small: 150, medium: 180, large: 220 }, units: { piece: 180, cup: 125 }, p: 0.3, c: 13.8, f: 0.2, kcal: 52 },
    { aliases: ['blueberries', 'blueberry'], serving: 2, sizes: { small: 1.5, medium: 2, large: 3 }, units: { piece: 2, cup: 148 }, p: 0.7, c: 14.5, f: 0.3, kcal: 57 },
    { aliases: ['strawberries', 'strawberry'], serving: 12, sizes: { small: 8, medium: 12, large: 20 }, units: { piece: 12, cup: 150 }, p: 0.7, c: 7.7, f: 0.3, kcal: 32 },
    { aliases: ['orange juice', 'oj'], serving: 248, kind: 'liquid', units: { cup: 248, glass: 248 }, p: 0.7, c: 10.4, f: 0.2, kcal: 45 },
    { aliases: ['oranges', 'orange'], serving: 130, sizes: { small: 100, medium: 130, large: 180 }, units: { piece: 130, cup: 180 }, p: 0.9, c: 11.8, f: 0.1, kcal: 47 },
    { aliases: ['pears', 'pear'], serving: 180, sizes: { small: 150, medium: 180, large: 230 }, units: { piece: 180, cup: 140 }, p: 0.4, c: 15.2, f: 0.1, kcal: 57 },
    { aliases: ['peaches', 'peach'], serving: 150, sizes: { small: 130, medium: 150, large: 180 }, units: { piece: 150, cup: 154 }, p: 0.9, c: 9.5, f: 0.3, kcal: 39 },
    { aliases: ['kiwis', 'kiwi', 'kiwifruit'], serving: 75, sizes: { small: 60, medium: 75, large: 100 }, units: { piece: 75, cup: 180 }, p: 1.1, c: 14.7, f: 0.5, kcal: 61 },
    { aliases: ['mangoes', 'mangos', 'mango'], serving: 300, sizes: { small: 200, medium: 300, large: 400 }, units: { piece: 300, cup: 165 }, p: 0.8, c: 15, f: 0.4, kcal: 60 },
    { aliases: ['chicken breasts', 'chicken breast', 'chicken'], serving: 100, units: { piece: 174, cup: 140 }, p: 31, c: 0, f: 3.6, kcal: 165 },
    { aliases: ['ground beef', 'beef'], serving: 100, p: 26, c: 0, f: 10, kcal: 202 },
    { aliases: ['salmon'], serving: 100, p: 22, c: 0, f: 12, kcal: 206 },
    { aliases: ['tuna'], serving: 100, p: 26, c: 0, f: 1, kcal: 116 },
    { aliases: ['turkey breast', 'turkey'], serving: 100, p: 29, c: 0, f: 1.7, kcal: 135 },
    { aliases: ['tofu'], serving: 100, p: 8, c: 1.9, f: 4.8, kcal: 76 },
    { aliases: ['greek yogurt', 'greek yoghurt'], serving: 170, units: { cup: 240 }, p: 10, c: 3.6, f: 0.4, kcal: 59 },
    { aliases: ['yogurt', 'yoghurt'], serving: 170, units: { cup: 245 }, p: 3.5, c: 4.7, f: 3.3, kcal: 61 },
    { aliases: ['cottage cheese'], serving: 113, units: { cup: 226 }, p: 11.1, c: 3.4, f: 4.3, kcal: 98 },
    { aliases: ['whole milk', 'milk'], serving: 244, kind: 'liquid', units: { cup: 244, glass: 244 }, p: 3.2, c: 4.8, f: 3.3, kcal: 61 },
    { aliases: ['white rice', 'rice'], serving: 195, units: { cup: 195, bowl: 250, plate: 300, scoop: 75 }, p: 2.7, c: 28.2, f: 0.3, kcal: 130,
      dry: { serving: 50, units: { cup: 185, bowl: 280, scoop: 65 }, p: 6.7, c: 80, f: 0.7, kcal: 365 } },
    { aliases: ['brown rice'], serving: 195, units: { cup: 195, bowl: 250, plate: 300, scoop: 75 }, p: 2.6, c: 25.6, f: 0.9, kcal: 123,
      dry: { serving: 50, units: { cup: 190, bowl: 285, scoop: 65 }, p: 7.5, c: 76.2, f: 2.7, kcal: 370 } },
    { aliases: ['whole wheat pasta', 'pasta', 'spaghetti'], serving: 140, units: { cup: 140, bowl: 210, scoop: 70 }, p: 5.8, c: 30.9, f: 0.9, kcal: 158,
      dry: { serving: 60, units: { cup: 100, bowl: 150, scoop: 50 }, p: 13, c: 74.7, f: 1.5, kcal: 371 } },
    { aliases: ['lentils', 'lentil', 'red lentils', 'green lentils'], serving: 198, units: { cup: 198, bowl: 250, scoop: 80 }, p: 9, c: 20.1, f: 0.4, kcal: 116,
      dry: { serving: 50, units: { cup: 192, bowl: 288, scoop: 60 }, p: 24.6, c: 63.4, f: 1.1, kcal: 353 } },
    { aliases: ['black beans', 'black bean'], serving: 172, units: { cup: 172, bowl: 230, scoop: 75 }, p: 8.9, c: 23.7, f: 0.5, kcal: 132,
      dry: { serving: 50, units: { cup: 190, bowl: 285, scoop: 65 }, p: 21.6, c: 62.4, f: 1.4, kcal: 341 } },
    { aliases: ['kidney beans', 'kidney bean'], serving: 172, units: { cup: 172, bowl: 230, scoop: 75 }, p: 8.7, c: 22.8, f: 0.5, kcal: 127,
      dry: { serving: 50, units: { cup: 184, bowl: 276, scoop: 65 }, p: 23.6, c: 60, f: 0.8, kcal: 333 } },
    { aliases: ['pinto beans', 'pinto bean'], serving: 172, units: { cup: 172, bowl: 230, scoop: 75 }, p: 9, c: 26.2, f: 0.7, kcal: 143,
      dry: { serving: 50, units: { cup: 193, bowl: 290, scoop: 65 }, p: 21.4, c: 62.6, f: 1.2, kcal: 347 } },
    { aliases: ['white beans', 'navy beans', 'beans', 'bean'], serving: 172, units: { cup: 172, bowl: 230, scoop: 75 }, p: 8.7, c: 23.7, f: 0.5, kcal: 130,
      dry: { serving: 50, units: { cup: 190, bowl: 285, scoop: 65 }, p: 22, c: 62, f: 1.2, kcal: 340 } },
    { aliases: ['chickpeas', 'chickpea', 'garbanzo beans', 'garbanzo bean'], serving: 164, units: { cup: 164, bowl: 230, scoop: 75 }, p: 8.9, c: 27.4, f: 2.6, kcal: 164,
      dry: { serving: 50, units: { cup: 200, bowl: 300, scoop: 65 }, p: 20.5, c: 63, f: 6, kcal: 378 } },
    { aliases: ['quinoa'], serving: 185, units: { cup: 185, bowl: 240, scoop: 75 }, p: 4.4, c: 21.3, f: 1.9, kcal: 120,
      dry: { serving: 50, units: { cup: 170, bowl: 255, scoop: 60 }, p: 14.1, c: 64.2, f: 6.1, kcal: 368 } },
    { aliases: ['barley'], serving: 157, units: { cup: 157, bowl: 220, scoop: 70 }, p: 2.3, c: 28.2, f: 0.4, kcal: 123,
      dry: { serving: 50, units: { cup: 200, bowl: 300, scoop: 65 }, p: 10, c: 77.7, f: 1.2, kcal: 354 } },
    { aliases: ['bulgur'], serving: 182, units: { cup: 182, bowl: 240, scoop: 75 }, p: 3.1, c: 18.6, f: 0.2, kcal: 83,
      dry: { serving: 50, units: { cup: 140, bowl: 210, scoop: 55 }, p: 12.3, c: 75.9, f: 1.3, kcal: 342 } },
    { aliases: ['couscous'], serving: 157, units: { cup: 157, bowl: 220, scoop: 70 }, p: 3.8, c: 23.2, f: 0.2, kcal: 112,
      dry: { serving: 50, units: { cup: 173, bowl: 260, scoop: 60 }, p: 12.8, c: 77.4, f: 0.6, kcal: 376 } },
    { aliases: ['whole wheat bread', 'whole grain bread', 'wholegrain bread', 'wholemeal bread', 'whole bread', 'bread', 'toast'], serving: 28, units: { piece: 28, slice: 28 }, p: 9, c: 49, f: 3.2, kcal: 265 },
    { aliases: ['pita breads', 'pita bread', 'pitas', 'pita'], serving: 60, units: { piece: 60, slice: 30 }, p: 9.1, c: 55.7, f: 1.2, kcal: 275 },
    { aliases: ['bagels', 'bagel'], serving: 95, units: { piece: 95 }, p: 10, c: 53, f: 1.5, kcal: 275 },
    { aliases: ['tortilla', 'tortillas'], serving: 45, units: { piece: 45 }, p: 8, c: 49, f: 8, kcal: 290 },
    { aliases: ['potatoes', 'potato'], serving: 170, sizes: { small: 120, medium: 170, large: 300 }, units: { piece: 170, cup: 150 }, p: 2, c: 20, f: 0.1, kcal: 93 },
    { aliases: ['sweet potatoes', 'sweet potato'], serving: 130, sizes: { small: 100, medium: 130, large: 250 }, units: { piece: 130, cup: 133 }, p: 1.6, c: 20.1, f: 0.1, kcal: 86 },
    { aliases: ['cucumbers', 'cucumber'], serving: 300, sizes: { small: 200, medium: 300, large: 400 }, units: { piece: 300, cup: 104 }, p: 0.7, c: 3.6, f: 0.1, kcal: 15 },
    { aliases: ['tomatoes', 'tomato'], serving: 120, sizes: { small: 90, medium: 120, large: 180 }, units: { piece: 120, cup: 180 }, p: 0.9, c: 3.9, f: 0.2, kcal: 18 },
    { aliases: ['bell peppers', 'bell pepper', 'red bell pepper', 'green bell pepper', 'yellow bell pepper', 'red pepper', 'green pepper', 'yellow pepper'], serving: 120, sizes: { small: 90, medium: 120, large: 170 }, units: { piece: 120, cup: 149 }, p: 1, c: 6, f: 0.3, kcal: 31 },
    { aliases: ['carrots', 'carrot'], serving: 60, sizes: { small: 40, medium: 60, large: 100 }, units: { piece: 60, cup: 128 }, p: 0.9, c: 9.6, f: 0.2, kcal: 41 },
    { aliases: ['zucchinis', 'zucchini', 'courgettes', 'courgette'], serving: 200, sizes: { small: 150, medium: 200, large: 300 }, units: { piece: 200, cup: 124 }, p: 1.2, c: 3.1, f: 0.3, kcal: 17 },
    { aliases: ['onions', 'onion'], serving: 110, sizes: { small: 70, medium: 110, large: 160 }, units: { piece: 110, cup: 160 }, p: 1.1, c: 9.3, f: 0.1, kcal: 40 },
    { aliases: ['lemons', 'lemon'], serving: 84, sizes: { small: 60, medium: 84, large: 110 }, units: { piece: 84, cup: 244 }, p: 1.1, c: 9.3, f: 0.3, kcal: 29 },
    { aliases: ['limes', 'lime'], serving: 67, sizes: { small: 40, medium: 67, large: 90 }, units: { piece: 67, cup: 244 }, p: 0.7, c: 10.5, f: 0.2, kcal: 30 },
    { aliases: ['broccoli head', 'broccoli'], serving: 300, sizes: { small: 200, medium: 300, large: 450 }, units: { piece: 300, cup: 91 }, p: 2.8, c: 6.6, f: 0.4, kcal: 34 },
    { aliases: ['spinach'], serving: 30, units: { cup: 30, bowl: 45, plate: 90, handful: 15 }, p: 2.9, c: 3.6, f: 0.4, kcal: 23 },
    { aliases: ['avocados', 'avocado'], serving: 200, sizes: { small: 150, medium: 200, large: 250 }, units: { piece: 200, cup: 150 }, p: 2, c: 8.5, f: 14.7, kcal: 160 },
    { aliases: ['peanut butter'], serving: 32, units: { tbsp: 16, tsp: 5 }, p: 25, c: 20, f: 50, kcal: 588 },
    { aliases: ['almonds', 'almond'], serving: 28, units: { cup: 143, piece: 1.2 }, p: 21.2, c: 21.6, f: 49.9, kcal: 579 },
    { aliases: ['dates', 'date'], serving: 8, sizes: { small: 6, medium: 8, large: 15 }, units: { piece: 8 }, p: 2.5, c: 75, f: 0.4, kcal: 282 },
    { aliases: ['cashews', 'cashew'], serving: 28, units: { piece: 1.6, cup: 137 }, p: 18.2, c: 30.2, f: 43.9, kcal: 553 },
    { aliases: ['grapes', 'grape'], serving: 5, sizes: { small: 3, medium: 5, large: 7 }, units: { piece: 5, cup: 151 }, p: 0.7, c: 18.1, f: 0.2, kcal: 69 },
    { aliases: ['olive oil', 'oil'], serving: 14, units: { tbsp: 14, tsp: 4.5, splash: 8, drizzle: 7 }, p: 0, c: 0, f: 100, kcal: 884 },
    { aliases: ['tomato sauce', 'pasta sauce', 'sauce'], serving: 60, units: { cup: 245, splash: 10, drizzle: 10 }, p: 1.5, c: 7, f: 0.5, kcal: 35 },
    { aliases: ['ice cream'], serving: 70, units: { cup: 130, bowl: 195, scoop: 70 }, p: 3.5, c: 23.6, f: 11, kcal: 207 },
    { aliases: ['butter'], serving: 14, units: { tbsp: 14, tsp: 4.7 }, p: 0.9, c: 0.1, f: 81.1, kcal: 717 },
    { aliases: ['cheddar cheese', 'cheese'], serving: 28, units: { slice: 28 }, p: 25, c: 1.3, f: 33, kcal: 403 },
    { aliases: ['protein powder', 'whey protein', 'whey'], serving: 30, units: { scoop: 30 }, p: 80, c: 7, f: 5, kcal: 390 }
  ];

  const wordNumbers = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
  const amount = '(\\d+\\/\\d+|\\d+(?:\\.\\d+)?|' + Object.keys(wordNumbers).sort((a, b) => b.length - a.length).join('|') + ')';
  const units = '(kilograms?|kg|grams?|g|ounces?|oz|pounds?|lbs?|cups?|glass(?:es)?|tablespoons?|tbsp|teaspoons?|tsp|slices?|scoops?|pieces?|handfuls?|splash(?:es)?|drizzles?|bowls?|plates?)';
  const leadingAmount = new RegExp('^' + amount + '(?=$|\\s|(?:kilograms?|kg|grams?|g|ounces?|oz|pounds?|lbs?)\\b)', 'i');
  const leadingUnit = new RegExp('^' + units + '\\b', 'i');
  const trailing = new RegExp('\\s+' + amount + '\\s*' + units + '\\b$', 'i');
  const sizeFactors = { small: 0.75, medium: 1, large: 1.25 };
  const round = value => Math.round(value);

  function quantity(value) {
    if (!value) return 1;
    if (value in wordNumbers) return wordNumbers[value];
    if (value.includes('/')) { const [top, bottom] = value.split('/').map(Number); return bottom ? top / bottom : NaN; }
    return Number(value);
  }

  function unitType(value) {
    if (!value) return 'piece';
    if (/^(?:g|grams?)$/.test(value)) return 'g';
    if (/^(kg|kilogram)/.test(value)) return 'kg';
    if (/^(oz|ounce)/.test(value)) return 'oz';
    if (/^(lb|pound)/.test(value)) return 'lb';
    if (/^cup/.test(value)) return 'cup';
    if (/^glass/.test(value)) return 'glass';
    if (/^(tbsp|tablespoon)/.test(value)) return 'tbsp';
    if (/^(tsp|teaspoon)/.test(value)) return 'tsp';
    if (/^slice/.test(value)) return 'slice';
    if (/^scoop/.test(value)) return 'scoop';
    if (/^handful/.test(value)) return 'handful';
    if (/^splash/.test(value)) return 'splash';
    if (/^drizzle/.test(value)) return 'drizzle';
    if (/^bowl/.test(value)) return 'bowl';
    if (/^plate/.test(value)) return 'plate';
    return 'piece';
  }

  function normalizeWords(value) {
    return value.toLowerCase()
      .replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4')
      .replace(/\bthree[-\s]+quarters?\b/g, '3/4')
      .replace(/\ba\s+quarter\b|\bquarter\b/g, '1/4')
      .replace(/\bhalf\b/g, '1/2')
      .replace(/\ba\s+couple\b|\bcouple\b/g, '2')
      .replace(/\ba\s+few\b|\bfew\b/g, '3');
  }

  function referenceGrams(food, unit, size) {
    const weightUnits = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
    if (unit in weightUnits) return weightUnits[unit];
    if (unit === 'piece') return food.sizes?.[size] ?? (food.units?.piece || food.serving) * sizeFactors[size];
    if (unit === 'slice') return (food.units?.slice || food.serving) * sizeFactors[size];
    const cup = food.units?.cup ?? (food.kind === 'liquid' ? 240 : 150);
    const common = { cup, glass: food.kind === 'liquid' ? 240 : cup, bowl: cup * 1.5, plate: cup * 2, handful: 30, scoop: 75, splash: 8, drizzle: 7, tbsp: 15, tsp: 5 };
    return (food.units?.[unit] || common[unit] || food.serving) * sizeFactors[size];
  }

  function parseItem(segment) {
    const original = segment.trim().replace(/^[,\s]+|[,\s]+$/g, '');
    let phrase = normalizeWords(original).replace(/^(?:i (?:ate|had)|about|roughly|around)\s+/i, '');
    const isDry = /\b(?:raw|dry|dried|uncooked)\b/.test(phrase);
    phrase = phrase.replace(/\b(?:raw|dry|dried|uncooked|cooked|prepared|boiled)\b/g, ' ').replace(/\s+/g, ' ').trim();
    let count = 1, unit = 'piece', size = 'medium';
    const end = phrase.match(trailing);
    if (end) {
      count = quantity(end[1].toLowerCase());
      unit = unitType(end[2].toLowerCase());
      phrase = phrase.slice(0, end.index).trim();
    } else {
      const start = phrase.match(leadingAmount);
      if (start) {
        count = quantity(start[1].toLowerCase());
        phrase = phrase.slice(start[0].length).trimStart();
      }
      for (let step = 0; step < 5; step++) {
        const filler = phrase.match(/^(?:of|a|an)\s+/);
        if (filler) { phrase = phrase.slice(filler[0].length); continue; }
        const sized = phrase.match(/^(small|medium|large)\b\s*/);
        if (sized) { size = sized[1]; phrase = phrase.slice(sized[0].length); continue; }
        const measured = phrase.match(leadingUnit);
        if (measured) { unit = unitType(measured[1].toLowerCase()); phrase = phrase.slice(measured[0].length).trimStart(); continue; }
        break;
      }
    }
    phrase = phrase.replace(/^(?:of|some|plain|cooked|raw|boiled|scrambled|fried|grilled|baked)\s+/g, '')
      .replace(/\s+(?:cooked|raw|boiled|scrambled|fried|grilled|baked)$/g, '').trim();
    const food = foods.find(candidate => candidate.aliases.includes(phrase));
    if (!food) throw new Error('Could not estimate that — try rewording, or switch to Manual.');
    if (!Number.isFinite(count) || count <= 0 || count > 10000) throw new Error('Could not estimate that — try rewording, or switch to Manual.');
    const profile = isDry && food.dry ? food.dry : food;
    const grams = count * referenceGrams(profile, unit, size);
    if (!grams || grams > 10000) throw new Error('Could not estimate that — try rewording, or switch to Manual.');
    return { name: original.replace(/^i (?:ate|had)\s+/i, ''), food, profile, grams };
  }

  function estimate(description) {
    if (typeof description !== 'string' || description.trim().length < 3 || description.length > 500) throw new Error('Describe your meal in 3–500 characters.');
    const segments = description.split(/\s*(?:,|;|\band\b|\+)\s*/i).filter(Boolean);
    if (!segments.length || segments.length > 20) throw new Error('Could not estimate that — try rewording, or switch to Manual.');
    const grouped = new Map();
    for (const item of segments.map(parseItem)) {
      let entry = grouped.get(item.food);
      if (!entry) {
        entry = { name: item.name, protein: 0, carbs: 0, fat: 0, calories: 0 };
        grouped.set(item.food, entry);
      } else entry.name += ` + ${item.name}`;
      entry.protein += item.profile.p * item.grams / 100;
      entry.carbs += item.profile.c * item.grams / 100;
      entry.fat += item.profile.f * item.grams / 100;
      entry.calories += item.profile.kcal * item.grams / 100;
    }
    const items = [...grouped.values()].map(({ name, protein, carbs, fat, calories }) => ({
      name,
      protein_g: round(protein),
      carbs_g: round(carbs),
      fat_g: round(fat),
      calories: round(calories)
    }));
    return { items };
  }

  const api = { estimate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SignalMealEstimator = api;
})(typeof window !== 'undefined' ? window : null);
