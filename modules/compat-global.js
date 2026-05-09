import { createCalendarApi } from './calendar.js';
import { mapApi } from './map.js';
import { createRenderApi } from './render.js';

const root = typeof window !== 'undefined' ? window : globalThis;
const dateTimeDeps = root.KLawsDateTime || {};
const safeHtmlDeps = root.KLawsSafeHtml || {};

root.KLawsCalendar = createCalendarApi(dateTimeDeps);
root.KLawsMap = mapApi;
root.KLawsRender = createRenderApi(safeHtmlDeps);
