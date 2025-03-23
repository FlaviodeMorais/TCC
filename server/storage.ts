import { 
  Reading, InsertReading, 
  Setpoint, InsertSetpoint,
  Setting, InsertSetting,
  ReadingStats
} from "@shared/schema";
import { createDb } from "./services/databaseService";

export interface IStorage {
  // Readings
  getLatestReadings(limit: number): Promise<Reading[]>;
  getReadingsByDateRange(startDate: string, endDate: string, maxResults?: number): Promise<Reading[]>;
  saveReading(reading: InsertReading): Promise<Reading>;
  
  // Setpoints
  getSetpoints(): Promise<Setpoint>;
  updateSetpoints(setpoints: InsertSetpoint): Promise<Setpoint>;
  
  // Settings
  getSettings(): Promise<Setting>;
  updateSettings(settings: InsertSetting): Promise<Setting>;
  
  // Statistics
  getTemperatureStats(readings: Reading[]): ReadingStats;
  getLevelStats(readings: Reading[]): ReadingStats;
}

export class MemStorage implements IStorage {
  private readings: Reading[] = [];
  private setpoints: Setpoint;
  private settings: Setting;
  private readingId = 1;
  
  constructor() {
    // Initialize with default values
    this.setpoints = {
      id: 1,
      tempMin: 20.0,
      tempMax: 30.0,
      levelMin: 60,
      levelMax: 90,
      updatedAt: new Date()
    };
    
    this.settings = {
      id: 1,
      systemName: "Aquaponia",
      updateInterval: 1,
      dataRetention: 30,
      emailAlerts: true,
      pushAlerts: true,
      alertEmail: null,
      tempCriticalMin: 18.0,
      tempWarningMin: 20.0,
      tempWarningMax: 28.0,
      tempCriticalMax: 30.0,
      levelCriticalMin: 50,
      levelWarningMin: 60,
      levelWarningMax: 85,
      levelCriticalMax: 90,
      updatedAt: new Date()
    };
  }
  
  async getLatestReadings(limit: number): Promise<Reading[]> {
    return this.readings
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
  
  async getReadingsByDateRange(startDate: string, endDate: string): Promise<Reading[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.readings.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= start && readingDate <= end;
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  async saveReading(reading: InsertReading): Promise<Reading> {
    const newReading: Reading = {
      id: this.readingId++,
      ...reading,
      timestamp: reading.timestamp || new Date()
    };
    
    this.readings.push(newReading);
    
    // Keep only the latest readings based on data retention setting
    if (this.readings.length > this.settings.dataRetention * 1440) {
      this.readings = this.readings
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.settings.dataRetention * 1440);
    }
    
    return newReading;
  }
  
  async getSetpoints(): Promise<Setpoint> {
    return this.setpoints;
  }
  
  async updateSetpoints(setpoints: InsertSetpoint): Promise<Setpoint> {
    this.setpoints = {
      ...this.setpoints,
      ...setpoints,
      updatedAt: new Date()
    };
    
    return this.setpoints;
  }
  
  async getSettings(): Promise<Setting> {
    return this.settings;
  }
  
  async updateSettings(settings: InsertSetting): Promise<Setting> {
    this.settings = {
      ...this.settings,
      ...settings,
      updatedAt: new Date()
    };
    
    return this.settings;
  }
  
  getTemperatureStats(readings: Reading[]): ReadingStats {
    if (readings.length === 0) {
      return { avg: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const temperatures = readings.map(r => r.temperature);
    const avg = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    
    // Calculate standard deviation
    const squareDiffs = temperatures.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    
    return { avg, min, max, stdDev };
  }
  
  getLevelStats(readings: Reading[]): ReadingStats {
    if (readings.length === 0) {
      return { avg: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const levels = readings.map(r => r.level);
    const avg = levels.reduce((sum, l) => sum + l, 0) / levels.length;
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    
    // Calculate standard deviation
    const squareDiffs = levels.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    
    return { avg, min, max, stdDev };
  }
}

// For real storage implementation using SQLite
export class SqliteStorage implements IStorage {
  private db;
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.db = await createDb();
      this.initialized = true;
      console.log('✅ SqliteStorage initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SqliteStorage:', error);
      throw error;
    }
  }
  
  private async ensureInitialized() {
    if (!this.initialized || !this.db) {
      console.log('🔄 Reinitializing database connection...');
      await this.init();
    }
  }

  async getLatestReadings(limit: number): Promise<Reading[]> {
    await this.ensureInitialized();
    return this.db.all(
      `SELECT * FROM readings 
       ORDER BY timestamp DESC 
       LIMIT ?`, 
      [limit]
    );
  }

  async getReadingsByDateRange(startDate: string, endDate: string, maxResults = 1000): Promise<Reading[]> {
    await this.ensureInitialized();
    console.log(`SQL Query: Buscando leituras entre ${startDate} e ${endDate} (max: ${maxResults})`);
    
    // Adicionar um dia à data final para incluir todas as leituras do último dia
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
    const adjustedEndDateString = adjustedEndDate.toISOString().split('T')[0];
    
    console.log(`Data inicial: ${startDate}, Data final ajustada: ${adjustedEndDateString}`);
    
    try {
      // Verificar se podemos acessar a tabela de leituras
      const tableCheck = await this.db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='readings'`
      );
      
      if (!tableCheck) {
        console.log("Tabela 'readings' não encontrada, recriando esquema...");
        // Recreate schema if needed
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL NOT NULL,
            level REAL NOT NULL,
            pump_status INTEGER DEFAULT 0,
            heater_status INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
        `);
        return [];
      }
      
      // Contagem de leituras no banco
      const countResult = await this.db.get('SELECT COUNT(*) as count FROM readings');
      console.log(`Total de leituras no banco: ${countResult ? countResult.count : 0}`);
      
      // Buscar leituras no intervalo de datas com limite
      const readings = await this.db.all(
        `SELECT * FROM readings 
         WHERE datetime(timestamp) >= datetime(?) AND datetime(timestamp) <= datetime(?) 
         ORDER BY timestamp ASC
         LIMIT ?`,
        [startDate + 'T00:00:00.000Z', adjustedEndDateString + 'T23:59:59.999Z', maxResults]
      );
      
      console.log(`Encontradas ${readings.length} leituras no banco de dados para o período especificado.`);
      
      // Converter os booleanos corretamente
      const formattedReadings = readings.map(reading => ({
        ...reading,
        pumpStatus: reading.pump_status === 1,
        heaterStatus: reading.heater_status === 1,
        timestamp: new Date(reading.timestamp)
      }));
      
      return formattedReadings;
    } catch (error) {
      console.error("Erro ao buscar leituras do banco:", error);
      return [];
    }
  }

  async saveReading(reading: InsertReading): Promise<Reading> {
    await this.ensureInitialized();
    
    try {
      // Verificar se já existe leitura com mesmo timestamp dentro de uma faixa de 5 segundos
      // e com os mesmos valores para evitar duplicação de dados no banco
      const timestamp = reading.timestamp || new Date();
      const timestampMs = timestamp.getTime();
      const minTime = new Date(timestampMs - 5000); // 5 segundos antes
      const maxTime = new Date(timestampMs + 5000); // 5 segundos depois
      
      const existingRecord = await this.db.get(
        `SELECT id FROM readings 
         WHERE datetime(timestamp) BETWEEN datetime(?) AND datetime(?)
         AND pump_status = ? AND heater_status = ?
         AND ABS(temperature - ?) < 0.1
         AND ABS(level - ?) < 0.1
         ORDER BY id DESC LIMIT 1`,
        [
          minTime.toISOString(), 
          maxTime.toISOString(), 
          reading.pumpStatus ? 1 : 0, 
          reading.heaterStatus ? 1 : 0,
          reading.temperature,
          reading.level
        ]
      );
      
      // Se encontrar registro similar recente com mesmos valores, não insere novamente
      if (existingRecord) {
        console.log(`⚠️ [${new Date().toLocaleTimeString()}] Detectada leitura similar recente (ID: ${existingRecord.id}), evitando duplicação`);
        // Retornar o registro existente em vez de criar novo
        const existingReading = await this.db.get(
          `SELECT * FROM readings WHERE id = ?`, 
          [existingRecord.id]
        );
        return {
          ...existingReading,
          pumpStatus: existingReading.pump_status === 1,
          heaterStatus: existingReading.heater_status === 1,
          timestamp: new Date(existingReading.timestamp)
        };
      }
      
      // Verificar o estado atual dos dispositivos em memória (mais recente que o banco)
      const { getCurrentDeviceStatus } = await import('./services/thingspeakService');
      const memoryState = getCurrentDeviceStatus();
      
      // Forçar consistência entre o log e o banco de dados
      const pumpStatusToLog = memoryState ? memoryState.pumpStatus : reading.pumpStatus;
      const heaterStatusToLog = memoryState ? memoryState.heaterStatus : reading.heaterStatus;
      
      // Inserir nova leitura se não existir similar
      console.log(`✅ [${new Date().toLocaleTimeString()}] Inserindo nova leitura: Temp=${reading.temperature.toFixed(1)}°C, Nível=${reading.level}%, Bomba=${pumpStatusToLog ? 'ON' : 'OFF'}, Aquecedor=${heaterStatusToLog ? 'ON' : 'OFF'}`);
      
      const result = await this.db.run(
        `INSERT INTO readings (temperature, level, pump_status, heater_status, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          reading.temperature,
          reading.level,
          reading.pumpStatus ? 1 : 0,
          reading.heaterStatus ? 1 : 0,
          timestamp
        ]
      );
    
    return {
      id: result.lastID,
      ...reading,
      timestamp: reading.timestamp || new Date()
    };
    } catch (error) {
      console.error('❌ Erro ao salvar leitura no banco:', error);
      throw error;
    }
  }

  async getSetpoints(): Promise<Setpoint> {
    await this.ensureInitialized();
    return this.db.get('SELECT * FROM setpoints WHERE id = 1');
  }

  async updateSetpoints(setpoints: InsertSetpoint): Promise<Setpoint> {
    await this.ensureInitialized();
    
    await this.db.run(
      `UPDATE setpoints 
       SET temp_min = ?, temp_max = ?, level_min = ?, level_max = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [setpoints.tempMin, setpoints.tempMax, setpoints.levelMin, setpoints.levelMax]
    );
    
    return this.getSetpoints();
  }

  async getSettings(): Promise<Setting> {
    await this.ensureInitialized();
    
    const settings = await this.db.get('SELECT * FROM settings WHERE id = 1');
    if (settings) return settings;
    
    // Create default settings if they don't exist
    await this.db.run(`
      INSERT INTO settings (id) VALUES (1)
    `);
    
    return this.db.get('SELECT * FROM settings WHERE id = 1');
  }

  async updateSettings(settings: InsertSetting): Promise<Setting> {
    await this.ensureInitialized();
    
    const columns = Object.keys(settings).map(key => `${this.toSnakeCase(key)} = ?`).join(', ');
    const values = Object.values(settings);
    
    await this.db.run(
      `UPDATE settings 
       SET ${columns}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      values
    );
    
    return this.getSettings();
  }
  
  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  getTemperatureStats(readings: Reading[]): ReadingStats {
    if (readings.length === 0) {
      return { avg: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const temperatures = readings.map(r => r.temperature);
    const avg = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    
    // Calculate standard deviation
    const squareDiffs = temperatures.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    
    return { avg, min, max, stdDev };
  }
  
  getLevelStats(readings: Reading[]): ReadingStats {
    if (readings.length === 0) {
      return { avg: 0, min: 0, max: 0, stdDev: 0 };
    }
    
    const levels = readings.map(r => r.level);
    const avg = levels.reduce((sum, l) => sum + l, 0) / levels.length;
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    
    // Calculate standard deviation
    const squareDiffs = levels.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, diff) => sum + diff, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);
    
    return { avg, min, max, stdDev };
  }
}

// Use SQLite storage by default
export const storage = new SqliteStorage();
