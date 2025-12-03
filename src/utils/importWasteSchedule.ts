import { supabase } from '@/integrations/supabase/client';

interface WasteScheduleRow {
  collection_date: string;
  day_of_week: string;
  waste_type: string;
  district: string;
}

export async function importWasteSchedule(csvContent: string) {
  const lines = csvContent.split('\n');
  const data: WasteScheduleRow[] = [];
  
  // Skip header line (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(';');
    if (parts.length >= 6) {
      const dateStr = parts[0]?.trim();
      const dayOfWeek = parts[1]?.trim();
      const restmuell = parts[2]?.trim();
      const gelberSack = parts[3]?.trim();
      const papier = parts[4]?.trim();
      const bio = parts[5]?.trim();
      
      if (dateStr && dayOfWeek) {
        // Convert German date format (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
        const [day, month, year] = dateStr.split('.');
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Add entry for each waste type if district is specified
        if (restmuell) {
          data.push({
            collection_date: isoDate,
            day_of_week: dayOfWeek,
            waste_type: 'Restmülltonne',
            district: restmuell
          });
        }
        
        if (gelberSack) {
          data.push({
            collection_date: isoDate,
            day_of_week: dayOfWeek,
            waste_type: 'Gelber Sack',
            district: gelberSack
          });
        }
        
        if (papier) {
          data.push({
            collection_date: isoDate,
            day_of_week: dayOfWeek,
            waste_type: 'Papiertonne',
            district: papier
          });
        }
        
        if (bio) {
          data.push({
            collection_date: isoDate,
            day_of_week: dayOfWeek,
            waste_type: 'Biotonne',
            district: bio
          });
        }
      }
    }
  }
  
  console.log(`Importing ${data.length} waste collection schedule records...`);
  
  // Upsert data in batches of 100 (no deletion needed)
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('waste_collection_schedule')
      .upsert(batch, {
        onConflict: 'collection_date,waste_type,district',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('Error upserting batch:', error);
      throw error;
    }
    
    console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)}`);
  }
  
  console.log('Waste collection schedule import completed successfully!');
  return data.length;
}

export async function getWasteSchedule(date?: string, wasteType?: string, district?: string) {
  let query = supabase
    .from('waste_collection_schedule')
    .select('*')
    .order('collection_date');
    
  if (date) {
    query = query.eq('collection_date', date);
  }
  
  if (wasteType) {
    query = query.eq('waste_type', wasteType);
  }
  
  if (district) {
    query = query.eq('district', district);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching waste schedule:', error);
    throw error;
  }
  
  return data;
}