import { apiRequest } from "./queryClient";
import { Reading } from "@shared/schema";

export type ReadingsResponse = {
  readings: Reading[];
  setpoints: {
    temp: {
      min: number;
      max: number;
    };
    level: {
      min: number;
      max: number;
    };
  };
};

/**
 * Interface que representa o estado atual dos dispositivos
 * Inclui o estado oficial do banco de dados e o estado em memória (mais recente)
 * Também indica se há uma sincronização pendente entre eles
 */
export type DeviceStatusResponse = {
  // Estado principal que a interface exibe por padrão (normalmente do banco)
  timestamp: string | number;
  pumpStatus: boolean;
  heaterStatus: boolean;
  
  // Metadados sobre o estado
  pendingSync?: boolean;
  source: 'memory' | 'database' | 'hybrid';
  
  // Estado em memória (atualizações mais recentes que podem não estar no banco ainda)
  memoryState?: {
    timestamp: string | number;
    pumpStatus: boolean;
    heaterStatus: boolean;
  };
  
  // Estado do banco (oficial, confirmado pelo ThingSpeak)
  databaseState?: {
    timestamp: string | number;
    pumpStatus?: boolean;
    heaterStatus?: boolean;
  } | null;
};

export type HistoricalReadingsResponse = ReadingsResponse & {
  stats: {
    temperature: {
      avg: number;
      min: number;
      max: number;
      stdDev: number;
    };
    level: {
      avg: number;
      min: number;
      max: number;
      stdDev: number;
    };
  };
};

// Get latest readings
export async function getLatestReadings(limit = 60): Promise<ReadingsResponse> {
  // Adicionar timestamp para evitar cache e melhorar desempenho
  const timestamp = new Date().getTime();
  const res = await apiRequest("GET", `/api/readings/latest?limit=${limit}&t=${timestamp}`, undefined, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return res.json();
}

// Get historical readings from database
export async function getHistoricalReadings(
  startDate: string,
  endDate: string
): Promise<HistoricalReadingsResponse> {
  const res = await apiRequest(
    "GET",
    `/api/readings/history?startDate=${startDate}&endDate=${endDate}`
  );
  return res.json();
}

// Get historical readings directly from ThingSpeak
export async function getThingspeakHistoricalReadings(
  days: number = 7,
  startDate?: string,
  endDate?: string
): Promise<HistoricalReadingsResponse> {
  let url = `/api/thingspeak/history?days=${days}`;
  
  // Se datas específicas forem fornecidas, adicionar à URL
  if (startDate && endDate) {
    url += `&startDate=${startDate}&endDate=${endDate}`;
  }
  
  const res = await apiRequest("GET", url);
  return res.json();
}

// Update pump status
export async function updatePumpStatus(status: boolean): Promise<{ success: boolean; pumpStatus: boolean }> {
  // Adicionar timestamp como nonce para prevenir cache
  const timestamp = new Date().getTime();
  const res = await apiRequest("POST", `/api/control/pump?t=${timestamp}`, { status }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return res.json();
}

// Update heater status
export async function updateHeaterStatus(status: boolean): Promise<{ success: boolean; heaterStatus: boolean }> {
  // Adicionar timestamp como nonce para prevenir cache
  const timestamp = new Date().getTime();
  const res = await apiRequest("POST", `/api/control/heater?t=${timestamp}`, { status }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return res.json();
}

// Update setpoints
export async function updateSetpoints(data: {
  tempMin: number;
  tempMax: number;
  levelMin: number;
  levelMax: number;
}) {
  const res = await apiRequest("POST", "/api/setpoints", data);
  return res.json();
}

// Get settings
export async function getSettings() {
  const res = await apiRequest("GET", "/api/settings");
  return res.json();
}

// Update settings
export async function updateSettings(data: any) {
  const res = await apiRequest("POST", "/api/settings", data);
  return res.json();
}

// Import data from ThingSpeak to local database
export async function importThingspeakToDatabase(days: number = 7): Promise<{ 
  success: boolean; 
  message: string; 
  count: number;
  background?: boolean;
}> {
  const res = await apiRequest("POST", `/api/sync/thingspeak-to-db?days=${days}`);
  return res.json();
}

// Get current device status (includes memory state and database state)
export async function getDeviceStatus(): Promise<DeviceStatusResponse> {
  // Adicionar timestamp para evitar cache
  const timestamp = new Date().getTime();
  const res = await apiRequest("GET", `/api/device/status?t=${timestamp}`, undefined, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  return res.json();
}
