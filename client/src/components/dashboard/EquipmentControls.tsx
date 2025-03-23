import { PumpControl } from './PumpControl';
import { HeaterControl } from './HeaterControl';
import { Reading } from '@shared/schema';

interface EquipmentControlsProps {
  latestReading?: Reading;
  isLoading: boolean;
}

export function EquipmentControls({ 
  latestReading, 
  isLoading
}: EquipmentControlsProps) {
  return (
    <div className="mb-8 px-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center text-base sm:text-lg glow-effect">
          <i className="fas fa-sliders-h text-white"></i>
        </div>
        <h2 className="text-xl sm:text-2xl font-light text-white">Controle de Equipamentos</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PumpControl 
          latestReading={latestReading} 
          isLoading={isLoading} 
        />
        
        <HeaterControl 
          latestReading={latestReading} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
