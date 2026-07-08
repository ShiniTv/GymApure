/**
 * Unit tests: parser de tasa BCV (HTML fixture, sin red).
 */
import { parseBcvUsdFromHtml, parseVenezuelanDecimal } from '../../src/lib/bcvScraper.ts';

const SAMPLE_HTML = `
<div id="dolar" class="col-sm-12 col-xs-12 ">
  <div class="field-content">
    <div class="row recuadrotsmc">
      <div class="col-sm-6 col-xs-6">
        <span> USD</span>
      </div>
      <div class="col-sm-6 col-xs-6 centrado textp">
        <strong class="strong-tb">685,94270000</strong>
      </div>
    </div>
  </div>
</div>
<div class="pull-right dinpro center">
  Fecha Valor: <span class="date-display-single" property="dc:date" datatype="xsd:dateTime" content="2026-07-08T00:00:00-04:00">Miércoles, 08 Julio 2026</span>
</div>
`;

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  OK  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function main() {
  console.log('=== Exchange rate parser ===\n');

  ok('parseVenezuelanDecimal coma', parseVenezuelanDecimal('685,94270000') === 685.9427);
  ok('parseVenezuelanDecimal miles', parseVenezuelanDecimal('1.234,56') === 1234.56);

  const parsed = parseBcvUsdFromHtml(SAMPLE_HTML);
  ok('parseBcvUsdFromHtml rate', Math.abs(parsed.rate - 685.9427) < 0.0001, String(parsed.rate));
  ok('parseBcvUsdFromHtml date', parsed.effectiveDate === '2026-07-08', parsed.effectiveDate);

  try {
    parseBcvUsdFromHtml('<html></html>');
    ok('missing USD throws', false);
  } catch {
    ok('missing USD throws', true);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
