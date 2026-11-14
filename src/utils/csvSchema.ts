import {
  FurnishingStatus,
  MLModelType,
  PredictionHistoryItem,
  PropertyInput,
  YesNo,
} from '../types/estate';

/**
 * Canonical column names for PropertyInput adhering to Housing.csv schema
 */
export const PROPERTY_SCHEMA_COLUMNS = [
  'area',
  'bedrooms',
  'bathrooms',
  'stories',
  'mainroad',
  'guestroom',
  'basement',
  'hotwaterheating',
  'airconditioning',
  'parking',
  'prefarea',
  'furnishingstatus',
] as const;

/**
 * Canonical column order for exporting Prediction History to CSV.
 * Includes all 12 PropertyInput schema fields in exact order plus prediction metadata.
 */
export const HISTORY_CSV_HEADERS = [
  'id',
  'timestamp',
  'area',
  'bedrooms',
  'bathrooms',
  'stories',
  'mainroad',
  'guestroom',
  'basement',
  'hotwaterheating',
  'airconditioning',
  'parking',
  'prefarea',
  'furnishingstatus',
  'primary_model',
  'predicted_price_bdt',
  'secondary_model',
  'secondary_price_bdt',
  'currency',
] as const;

export interface ParsedCSVPropertyRow {
  rowNumber: number;
  inputs: PropertyInput;
  model?: MLModelType;
  existingPrice?: number;
  secondaryModel?: MLModelType;
  secondaryPrice?: number;
  timestamp?: string;
  id?: string;
  warnings: string[];
}

export interface CSVParseResult {
  validRows: ParsedCSVPropertyRow[];
  errors: { rowNumber: number; message: string }[];
  detectedColumns: string[];
  missingSchemaColumns: string[];
}

/**
 * RFC-4180 compliant CSV line splitter handling quoted fields and escaped quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Escapes a single cell value for safe CSV output
 */
function escapeCSVCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function normalizeYesNo(raw: string | undefined, fallback: YesNo = 'no'): { value: YesNo; valid: boolean } {
  if (raw === undefined || raw === '') return { value: fallback, valid: false };
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'yes' || cleaned === 'y' || cleaned === 'true' || cleaned === '1') {
    return { value: 'yes', valid: true };
  }
  if (cleaned === 'no' || cleaned === 'n' || cleaned === 'false' || cleaned === '0') {
    return { value: 'no', valid: true };
  }
  return { value: fallback, valid: false };
}

function normalizeFurnishing(raw: string | undefined): {
  value: FurnishingStatus;
  valid: boolean;
} {
  if (!raw) return { value: 'semi-furnished', valid: false };
  const cleaned = raw.trim().toLowerCase().replace(/_/g, '-');
  if (cleaned === 'furnished') return { value: 'furnished', valid: true };
  if (cleaned === 'semi-furnished' || cleaned === 'semifurnished' || cleaned === 'semi') {
    return { value: 'semi-furnished', valid: true };
  }
  if (cleaned === 'unfurnished') return { value: 'unfurnished', valid: true };
  return { value: 'semi-furnished', valid: false };
}

function normalizeModel(raw: string | undefined): MLModelType | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (cleaned.includes('tree') || cleaned === 'dt' || cleaned === 'decision_tree') {
    return 'decision_tree';
  }
  if (cleaned.includes('linear') || cleaned === 'lr' || cleaned === 'linear_regression') {
    return 'linear_regression';
  }
  return undefined;
}

/**
 * Parses and validates CSV text into PropertyInput records adhering to the existing schema.
 * Supports:
 * 1. Standard Housing.csv / PropertyInput schema (area, bedrooms, bathrooms, stories, mainroad, ...)
 * 2. Exported ESTATIQ AI Prediction History CSV files
 * 3. One-hot encoded model_columns.pkl CSVs (mainroad_yes, furnishingstatus_semi-furnished, etc.)
 */
export function parsePropertyCSV(csvText: string): CSVParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, '') // Strip UTF-8 BOM if present
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [
        {
          rowNumber: 1,
          message: 'CSV file must contain a header row and at least one property data row.',
        },
      ],
      detectedColumns: [],
      missingSchemaColumns: [...PROPERTY_SCHEMA_COLUMNS],
    };
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, '')
  );

  // Map header aliases to canonical field names
  const findColIdx = (candidates: string[]): number => {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colMap = {
    area: findColIdx(['area', 'sqft', 'area(sq.ft.)', 'area(sqft)', 'propertyarea']),
    bedrooms: findColIdx(['bedrooms', 'bedroom', 'beds', 'bhk']),
    bathrooms: findColIdx(['bathrooms', 'bathroom', 'baths']),
    stories: findColIdx(['stories', 'story', 'floors']),
    mainroad: findColIdx(['mainroad', 'main_road', 'mainroad_yes']),
    guestroom: findColIdx(['guestroom', 'guest_room', 'guestroom_yes']),
    basement: findColIdx(['basement', 'basement_yes']),
    hotwaterheating: findColIdx([
      'hotwaterheating',
      'hot_water_heating',
      'hotwater',
      'hotwaterheating_yes',
    ]),
    airconditioning: findColIdx([
      'airconditioning',
      'air_conditioning',
      'ac',
      'airconditioning_yes',
    ]),
    parking: findColIdx(['parking', 'parkingspaces', 'parking_spaces']),
    prefarea: findColIdx(['prefarea', 'preferredarea', 'pref_area', 'prefarea_yes']),
    furnishingstatus: findColIdx(['furnishingstatus', 'furnishing_status', 'furnishing']),
    furnishingSemi: findColIdx(['furnishingstatus_semi-furnished', 'furnishingstatus_semifurnished']),
    furnishingUnfurnished: findColIdx(['furnishingstatus_unfurnished']),
    model: findColIdx(['primary_model', 'model', 'ml_model', 'primarymodel']),
    price: findColIdx(['predicted_price_bdt', 'predicted_price', 'price', 'primaryprice']),
    secondaryModel: findColIdx(['secondary_model', 'secondarymodel']),
    secondaryPrice: findColIdx(['secondary_price_bdt', 'secondary_price', 'secondaryprice']),
    timestamp: findColIdx(['timestamp', 'date', 'created_at']),
    id: findColIdx(['id', 'record_id']),
  };

  const missingSchemaColumns: string[] = [];
  for (const col of PROPERTY_SCHEMA_COLUMNS) {
    if (col === 'furnishingstatus') {
      if (
        colMap.furnishingstatus === -1 &&
        colMap.furnishingSemi === -1 &&
        colMap.furnishingUnfurnished === -1
      ) {
        missingSchemaColumns.push(col);
      }
    } else if (colMap[col] === -1) {
      missingSchemaColumns.push(col);
    }
  }

  // Require at least 'area' to consider the CSV aligned with the property schema
  if (colMap.area === -1) {
    return {
      validRows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Missing required schema column "area". Expected columns: ${PROPERTY_SCHEMA_COLUMNS.join(', ')}`,
        },
      ],
      detectedColumns: rawHeaders,
      missingSchemaColumns,
    };
  }

  const validRows: ParsedCSVPropertyRow[] = [];
  const errors: { rowNumber: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const cells = parseCSVLine(lines[i]);
    if (cells.length === 1 && cells[0] === '') continue;

    const warnings: string[] = [];
    const getCell = (idx: number): string | undefined =>
      idx >= 0 && idx < cells.length ? cells[idx] : undefined;

    // 1. Area (required numeric, clamped/validated to 500 - 30,000 sq ft)
    const rawArea = Number(getCell(colMap.area)?.replace(/,/g, ''));
    if (isNaN(rawArea) || rawArea <= 0) {
      errors.push({
        rowNumber,
        message: `Row ${rowNumber}: Invalid or missing numeric "area" value ("${getCell(colMap.area) ?? ''}").`,
      });
      continue;
    }
    let area = Math.round(rawArea);
    if (area < 500 || area > 30000) {
      warnings.push(`Area (${area}) clamped to valid range [500, 30000] sq ft.`);
      area = Math.min(30000, Math.max(500, area));
    }

    // 2. Bedrooms (integer 1..6)
    const rawBeds = Number(getCell(colMap.bedrooms));
    const bedrooms = !isNaN(rawBeds) && rawBeds >= 1 ? Math.min(6, Math.round(rawBeds)) : 3;
    if (isNaN(rawBeds) || rawBeds < 1 || rawBeds > 6) {
      warnings.push(`Bedrooms defaulted/clamped to ${bedrooms}.`);
    }

    // 3. Bathrooms (integer 1..4)
    const rawBaths = Number(getCell(colMap.bathrooms));
    const bathrooms = !isNaN(rawBaths) && rawBaths >= 1 ? Math.min(4, Math.round(rawBaths)) : 2;
    if (isNaN(rawBaths) || rawBaths < 1 || rawBaths > 4) {
      warnings.push(`Bathrooms defaulted/clamped to ${bathrooms}.`);
    }

    // 4. Stories (integer 1..4)
    const rawStories = Number(getCell(colMap.stories));
    const stories =
      !isNaN(rawStories) && rawStories >= 1 ? Math.min(4, Math.round(rawStories)) : 2;
    if (isNaN(rawStories) || rawStories < 1 || rawStories > 4) {
      warnings.push(`Stories defaulted/clamped to ${stories}.`);
    }

    // 5. Parking (integer 0..3)
    const rawParking = Number(getCell(colMap.parking));
    const parking =
      !isNaN(rawParking) && rawParking >= 0 ? Math.min(3, Math.round(rawParking)) : 1;
    if (isNaN(rawParking) || rawParking < 0 || rawParking > 3) {
      warnings.push(`Parking defaulted/clamped to ${parking}.`);
    }

    // 6. Binary Yes/No Amenities
    const mainroadRes = normalizeYesNo(getCell(colMap.mainroad), 'yes');
    const guestroomRes = normalizeYesNo(getCell(colMap.guestroom), 'no');
    const basementRes = normalizeYesNo(getCell(colMap.basement), 'no');
    const hotwaterRes = normalizeYesNo(getCell(colMap.hotwaterheating), 'no');
    const acRes = normalizeYesNo(getCell(colMap.airconditioning), 'no');
    const prefareaRes = normalizeYesNo(getCell(colMap.prefarea), 'no');

    // 7. Furnishing Status (supports either 'furnishingstatus' column OR one-hot columns)
    let furnishingstatus: FurnishingStatus = 'semi-furnished';
    if (colMap.furnishingstatus !== -1) {
      const furnRes = normalizeFurnishing(getCell(colMap.furnishingstatus));
      furnishingstatus = furnRes.value;
      if (!furnRes.valid) {
        warnings.push(`Furnishing status normalized to "${furnishingstatus}".`);
      }
    } else if (colMap.furnishingSemi !== -1 || colMap.furnishingUnfurnished !== -1) {
      const isSemi = normalizeYesNo(getCell(colMap.furnishingSemi), 'no').value === 'yes';
      const isUnfurn = normalizeYesNo(getCell(colMap.furnishingUnfurnished), 'no').value === 'yes';
      furnishingstatus = isUnfurn ? 'unfurnished' : isSemi ? 'semi-furnished' : 'furnished';
    }

    const inputs: PropertyInput = {
      area,
      bedrooms,
      bathrooms,
      stories,
      mainroad: mainroadRes.value,
      guestroom: guestroomRes.value,
      basement: basementRes.value,
      hotwaterheating: hotwaterRes.value,
      airconditioning: acRes.value,
      parking,
      prefarea: prefareaRes.value,
      furnishingstatus,
    };

    const model = normalizeModel(getCell(colMap.model));
    const secondaryModel = normalizeModel(getCell(colMap.secondaryModel));

    const rawPrice = Number(getCell(colMap.price)?.replace(/,/g, ''));
    const existingPrice = !isNaN(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : undefined;

    const rawSecPrice = Number(getCell(colMap.secondaryPrice)?.replace(/,/g, ''));
    const secondaryPrice =
      !isNaN(rawSecPrice) && rawSecPrice > 0 ? Math.round(rawSecPrice) : undefined;

    const rawTs = getCell(colMap.timestamp);
    const timestamp =
      rawTs && !isNaN(new Date(rawTs).getTime()) ? new Date(rawTs).toISOString() : undefined;

    const id = getCell(colMap.id) || undefined;

    validRows.push({
      rowNumber,
      inputs,
      model,
      existingPrice,
      secondaryModel,
      secondaryPrice,
      timestamp,
      id,
      warnings,
    });
  }

  return {
    validRows,
    errors,
    detectedColumns: rawHeaders,
    missingSchemaColumns,
  };
}

/**
 * Generates a RFC-4180 CSV string from an array of PredictionHistoryItem records,
 * strictly adhering to the PropertyInput + PredictionHistoryItem data schema.
 */
export function serializePredictionHistoryToCSV(items: PredictionHistoryItem[]): string {
  const rows = items.map((item) =>
    [
      escapeCSVCell(item.id),
      escapeCSVCell(item.timestamp),
      escapeCSVCell(item.inputs.area),
      escapeCSVCell(item.inputs.bedrooms),
      escapeCSVCell(item.inputs.bathrooms),
      escapeCSVCell(item.inputs.stories),
      escapeCSVCell(item.inputs.mainroad),
      escapeCSVCell(item.inputs.guestroom),
      escapeCSVCell(item.inputs.basement),
      escapeCSVCell(item.inputs.hotwaterheating),
      escapeCSVCell(item.inputs.airconditioning),
      escapeCSVCell(item.inputs.parking),
      escapeCSVCell(item.inputs.prefarea),
      escapeCSVCell(item.inputs.furnishingstatus),
      escapeCSVCell(item.primaryModel),
      escapeCSVCell(item.primaryPrice),
      escapeCSVCell(item.secondaryModel || ''),
      escapeCSVCell(item.secondaryPrice || ''),
      escapeCSVCell(item.currency || 'BDT'),
    ].join(',')
  );

  return [HISTORY_CSV_HEADERS.join(','), ...rows].join('\n');
}

/**
 * Triggers a browser file download of the Prediction History CSV
 */
export function downloadPredictionHistoryCSV(
  items: PredictionHistoryItem[],
  filenamePrefix = 'ESTATIQ_AI_Prediction_History'
): void {
  const csvContent = serializePredictionHistoryToCSV(items);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a Sample Property CSV Template matching Housing.csv & PropertyInput schema
 */
export function downloadSamplePropertyCSVTemplate(): void {
  const headers = [...PROPERTY_SCHEMA_COLUMNS, 'model'];
  const sampleRows = [
    ['7420', '4', '2', '3', 'yes', 'no', 'no', 'no', 'yes', '2', 'yes', 'furnished', 'linear_regression'],
    ['6360', '3', '2', '4', 'yes', 'no', 'no', 'no', 'yes', '1', 'yes', 'furnished', 'decision_tree'],
    ['4880', '4', '2', '2', 'yes', 'yes', 'yes', 'no', 'yes', '2', 'no', 'semi-furnished', 'linear_regression'],
    ['3600', '3', '1', '2', 'yes', 'no', 'no', 'no', 'no', '1', 'no', 'unfurnished', 'decision_tree'],
  ];

  const csvContent = [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ESTATIQ_AI_Property_Template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
