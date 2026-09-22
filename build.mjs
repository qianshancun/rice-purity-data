import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const stats = JSON.parse(readFileSync(new URL('./src/question-rates.json', import.meta.url), 'utf8'));
const questionText = readFileSync(new URL('./src/questions.txt', import.meta.url), 'utf8')
  .split('\n|\n')
  .map((block) => block
    .split('\n')
    .filter((line) => !/^\([01]\)/.test(line.trim()))
    .join(' ')
    .replace(/<svg[\s\S]*$/i, '')
    .replace(/<div id="rpt_q93_extra">[\s\S]*$/i, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([?.!,])/g, '$1')
    .trim())
  .filter(Boolean);

if (questionText.length !== stats.questions.length) {
  throw new Error(`Question count ${questionText.length} does not match ${stats.questions.length} rate rows`);
}

const COUNTRY_SCORES = [
  ['Argentina', '0.61%', 57.4],
  ['France', '0.67%', 57.9],
  ['South Africa', '0.57%', 59.2],
  ['Spain', '0.60%', 59.3],
  ['Russia', '0.61%', 59.2],
  ['Mexico', '0.74%', 60.1],
  ['Canada', '3.20%', 61.0],
  ['Brazil', '0.95%', 63.2],
  ['New Zealand', '0.74%', 63.3],
  ['Netherlands', '0.43%', 63.7],
  ['United States', '54.21%', 63.9],
  ['Australia', '2.26%', 64.3],
  ['Italy', '1.76%', 65.4],
  ['Ireland', '1.82%', 65.6],
  ['United Kingdom', '18.69%', 65.7],
  ['Israel', '0.40%', 65.9],
  ['Germany', '0.94%', 66.3],
  ['Japan', '0.56%', 66.6],
].sort((a, b) => a[2] - b[2]);

const AGE_SCORES = [
  ['18–24', 87.36, 89.24],
  ['25–34', 74.05, 79.68],
  ['35–44', 71.03, 71.11],
  ['45–54', 62.83, 67.19],
  ['55–64', 61.12, 66.22],
  ['65+', 58.33, 65.39],
];

const SCORE_BANDS = [
  ['100', 0.75, 0.82],
  ['99–95', 8.32, 9.79],
  ['94–90', 9.19, 9.52],
  ['89–70', 26.37, 28.94],
  ['69–50', 25.74, 26.72],
  ['49–20', 18.58, 15.61],
  ['19–10', 4.79, 3.19],
  ['9–1', 5.71, 4.89],
  ['0', 0.55, 0.52],
];

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bar(value, max, color) {
  const width = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return `<span class="track"><span class="fill" style="width:${width.toFixed(2)}%;background:${color}"></span></span>`;
}

const countryIndex = stats.columns
  .map((name, index) => ({ name, index }))
  .filter((column) => !['Overall', 'Male', 'Female'].includes(column.name));
const overallIndex = stats.columns.indexOf('Overall');
const maleIndex = stats.columns.indexOf('Male');
const femaleIndex = stats.columns.indexOf('Female');

const bandMax = 32;
const bands = SCORE_BANDS.map(([label, men, women]) => `
  <div class="band">
    <div class="band-label">${esc(label)}</div>
    <div class="band-bars">
      <div class="band-row"><span>Men</span>${bar(men, bandMax, '#1a120c')}<b>${men.toFixed(2)}%</b></div>
      <div class="band-row"><span>Women</span>${bar(women, bandMax, '#a33b3b')}<b>${women.toFixed(2)}%</b></div>
    </div>
  </div>`).join('');

const ages = AGE_SCORES.map(([label, men, women]) => `
  <div class="band">
    <div class="band-label">${esc(label)}</div>
    <div class="band-bars">
      <div class="band-row"><span>Men</span>${bar(men - 50, 50, '#1a120c')}<b>${men.toFixed(2)}</b></div>
      <div class="band-row"><span>Women</span>${bar(women - 50, 50, '#a33b3b')}<b>${women.toFixed(2)}</b></div>
    </div>
  </div>`).join('');

const countries = COUNTRY_SCORES.map(([name, share, score]) => `
  <div class="crow">
    <span class="cname">${esc(name)}</span>
    ${bar(score - 50, 25, '#3f4f38')}
    <b>${score.toFixed(1)}</b>
    <span class="cshare">${esc(share)}</span>
  </div>`).join('');

const questions = stats.questions.map((question) => {
  const overall = Number(question.rates[overallIndex]);
  const male = Number(question.rates[maleIndex]);
  const female = Number(question.rates[femaleIndex]);
  const places = countryIndex
    .map((column) => ({ name: column.name, rate: Number(question.rates[column.index]) }))
    .filter((place) => Number.isFinite(place.rate))
    .sort((a, b) => b.rate - a.rate);
  const placeHtml = places.map((place) => `<li><span>${esc(place.name)}</span><b>${place.rate.toFixed(2)}%</b></li>`).join('');
  return `<details class="q">
    <summary>
      <span class="qn">${question.n}</span>
      <span class="qt">${esc(questionText[question.n - 1])}</span>
      ${bar(overall, 100, '#3f4f38')}
      <b class="qp">${overall.toFixed(1)}%</b>
    </summary>
    <div class="qmore">
      <div class="band-row"><span>Men</span>${bar(male, 100, '#1a120c')}<b>${male.toFixed(2)}%</b></div>
      <div class="band-row"><span>Women</span>${bar(female, 100, '#a33b3b')}<b>${female.toFixed(2)}%</b></div>
      <ul class="places">${placeHtml}</ul>
    </div>
  </details>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rice Purity Test Data</title>
<meta name="description" content="Rice Purity Test scores by age and country, and how often each item is checked.">
<link rel="canonical" href="https://rice-purity-data.pages.dev/">
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #f4e4c4; color: #24180f; font: 17px/1.45 Palatino, "Palatino Linotype", Georgia, serif; }
  main { max-width: 46rem; margin: 0 auto; padding: 1.6rem 1.2rem 3rem; }
  .stamp { margin: 0; text-align: center; color: #c41616; font-family: "Snell Roundhand", "Segoe Script", "Brush Script MT", cursive; font-size: 1.7rem; transform: rotate(-7deg); }
  h1 { display: flex; align-items: center; justify-content: center; gap: .7rem; margin: .2rem 0 .3rem; font-size: 2.2rem; font-weight: 500; letter-spacing: .01em; }
  h1 i { flex: 1; max-width: 4.5rem; border-top: 3px solid #1a120c; border-bottom: 1px solid #1a120c; height: 0; }
  .back { text-align: center; margin: 0 0 1.4rem; }
  .back a { color: #1a120c; }
  h2 { text-align: center; font-size: 1.25rem; margin: 2rem 0 .35rem; }
  .note { text-align: center; color: #5c4d3c; margin: 0 0 1rem; font-size: .95rem; }
  .track { display: block; flex: 1; height: .55rem; background: #e4d3aa; }
  .fill { display: block; height: 100%; }
  .band, .crow, .band-row, summary { display: flex; align-items: center; gap: .55rem; }
  .band { margin: .35rem 0 .7rem; }
  .band-label { width: 4.2rem; flex: none; }
  .band-bars { flex: 1; }
  .band-row { margin: .12rem 0; }
  .band-row span, .crow .cname { width: 7.2rem; flex: none; }
  .band-row b, .crow b, .qp { width: 3.6rem; text-align: right; font-weight: 500; flex: none; }
  .crow { margin: .28rem 0; }
  .cshare { width: 4.2rem; text-align: right; color: #6d5b42; flex: none; font-size: .9rem; }
  .find { display: block; width: 100%; box-sizing: border-box; margin: .4rem 0 1rem; padding: .45rem .6rem; border: 1px solid #1a120c; background: #f4e4c4; font: inherit; color: inherit; }
  .q { border-bottom: 1px solid #e3d2a4; padding: .45rem 0; }
  summary { cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  .qn { width: 1.7rem; color: #6d5b42; flex: none; }
  .qt { flex: 1.4; }
  .q .track { flex: 1; min-width: 4rem; }
  .qmore { margin: .45rem 0 .2rem 1.7rem; }
  .places { list-style: none; display: flex; flex-wrap: wrap; gap: .35rem .8rem; margin: .55rem 0 0; padding: 0; color: #3a2d20; font-size: .92rem; }
  .places li { display: flex; gap: .35rem; }
  .legend { display: flex; justify-content: center; gap: 1.2rem; margin: 0 0 .8rem; font-size: .92rem; }
  .swatch { display: inline-block; width: .7rem; height: .7rem; margin-right: .3rem; vertical-align: -1px; }
</style>
</head>
<body>
<main>
  <p class="stamp">Rice Thresher Version</p>
  <h1><i></i>Rice Purity Test Data<i></i></h1>
  <p class="back"><a href="https://www.arealme.com/rice-purity-test/en/">Rice Purity Test</a></p>

  <h2 id="distribution">Score distribution</h2>
  <p class="legend"><span><i class="swatch" style="background:#1a120c"></i>Men</span><span><i class="swatch" style="background:#a33b3b"></i>Women</span></p>
  ${bands}
  <p class="note">Share of scores in each band.</p>

  <h2 id="age">Average score by age</h2>
  <p class="legend"><span><i class="swatch" style="background:#1a120c"></i>Men</span><span><i class="swatch" style="background:#a33b3b"></i>Women</span></p>
  ${ages}
  <p class="note">Bars start at 50. A higher score means fewer items checked.</p>

  <h2 id="country">Average score by country</h2>
  ${countries}
  <p class="note">Bars start at 50. The last column is the share of visitors. 15% sample of about 20,000 results.</p>

  <h2 id="questions">How many people checked each item</h2>
  <input class="find" type="search" placeholder="Find a question" aria-label="Find a question">
  <div id="questions">${questions}</div>
  <p class="note">The bar is the overall percent who checked yes. Open an item for men, women, and countries. Packaged Jun 27, 2022.</p>
</main>
<script>
  const input = document.querySelector('.find');
  const rows = Array.from(document.querySelectorAll('.q'));
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    rows.forEach((row) => {
      const text = row.querySelector('.qt').textContent.toLowerCase();
      row.hidden = query.length > 0 && !text.includes(query);
    });
  });
</script>
</body>
</html>
`;

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/index.html', import.meta.url), html);
console.log('dist/index.html', html.length);
