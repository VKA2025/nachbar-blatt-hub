import { supabase } from '@/integrations/supabase/client';

interface StreetDistrictRow {
  street_name: string;
  notes: string | null;
  district: string;
  year: number;
}

export async function importStreetData(csvContent: string, year: number = 2025) {
  const lines = csvContent.split('\n');
  const data: StreetDistrictRow[] = [];
  
  // Skip header line (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(';');
    if (parts.length >= 3) {
      const streetName = parts[0]?.trim();
      const notes = parts[1]?.trim() || null;
      const district = parts[2]?.trim();
      
      if (streetName && district) {
        data.push({
          street_name: streetName,
          notes: notes,
          district: district,
          year: year
        });
      }
    }
  }
  
  console.log(`Importing ${data.length} street-district records...`);
  
  // Insert data in batches of 100
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('street_districts')
      .upsert(batch, { 
        onConflict: 'street_name,notes,district,year',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Error upserting batch:', error);
      throw error;
    }
    
    console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)}`);
  }
  
  console.log('Street data import completed successfully!');
  return data.length;
}

export async function getStreetDistricts(year?: number) {
  let query = supabase
    .from('street_districts')
    .select('*')
    .order('street_name');
    
  if (year) {
    query = query.eq('year', year);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching street districts:', error);
    throw error;
  }
  
  return data;
}