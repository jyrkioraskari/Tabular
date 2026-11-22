import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeColumnDescriptionsToTurtle } from '../src/services/columnDescriptionRdf.js';

test('keeps semantic property and measurement unit as separate column metadata', () => {
  const turtle = serializeColumnDescriptionsToTurtle([{
    header: 'Temperature',
    description: 'Air temperature',
    descriptionUri: 'https://example.org/airTemperature',
    unit: 'Degree Celsius',
    unitUri: 'http://qudt.org/vocab/unit/DEG_C',
  }]);

  assert.match(
    turtle,
    /csvw:propertyUrl "https:\/\/example\.org\/airTemperature"\^\^csvw:uriTemplate/,
  );
  assert.match(
    turtle,
    /sdmx-attribute:unitMeasure <http:\/\/qudt\.org\/vocab\/unit\/DEG_C>/,
  );
  assert.doesNotMatch(turtle, /csvw:propertyUrl[^\n]+DEG_C/);
  assert.doesNotMatch(turtle, /qudt:unit/);
});
