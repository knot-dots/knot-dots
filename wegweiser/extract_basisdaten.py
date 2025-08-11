#!/usr/bin/env python3
"""
Wegweiser Kommune - Basisdaten Extraktion
Erstellt Basisdaten für alle Gemeinden, Landkreise und kreisfreie Städte

Basisdaten enthalten:
- Bundesland
- AGS (Amtlicher Gemeindeschlüssel) 
- ARS (Amtlicher Regionalschlüssel)
- Kommunaltyp (GEMEINDE, LANDKREIS, KREISFREIE_STADT)
- Verwaltungstyp
"""

import requests
import json
import csv
import time
from typing import Dict, List, Any
from datetime import datetime

class BasisdatenExtractor:
    def __init__(self, base_url: str = "https://www.wegweiser-kommune.de/data-api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Basisdaten-Extraktor/1.0',
            'Accept': 'application/json'
        })
        
    def get_all_regions(self) -> List[Dict[str, Any]]:
        """Lädt alle Regionen über /rest/region/list und filtert clientseitig"""
        print("📡 Lade alle Regionen von Wegweiser Kommune API...")
        
        all_regions = []
        batch_size = 5000  # Große Batches
        offset = 0
        target_types = {'BUNDESLAND', 'LANDKREIS', 'KREISFREIE_STADT', 'GEMEINDE'}
        
        try:
            while True:
                print(f"  📦 Batch {offset//batch_size + 1}: Lade {batch_size} Regionen ab Position {offset}...")
                
                params = {
                    'max': batch_size,
                    'offset': offset
                }
                
                response = self.session.get(f"{self.base_url}/rest/region/list", params=params)
                response.raise_for_status()
                regions = response.json()
                
                if not isinstance(regions, list) or not regions:
                    break
                
                # Filter nur gewünschte Typen
                filtered_regions = [
                    region for region in regions 
                    if region.get('type') in target_types
                ]
                
                all_regions.extend(filtered_regions)
                
                print(f"     ✅ +{len(filtered_regions)} relevante von {len(regions)} Regionen " +
                      f"({len(all_regions)} gesamt)")
                
                # Wenn weniger als batch_size zurückgegeben wurde, sind wir fertig
                if len(regions) < batch_size:
                    break
                    
                offset += batch_size
                time.sleep(0.1)  # Kurze Pause zwischen Requests
                
            print(f"✅ {len(all_regions)} deutsche Verwaltungsregionen gesamt geladen")
            return all_regions
            
        except requests.RequestException as e:
            print(f"❌ Fehler beim Laden der Regionen: {e}")
            return all_regions  # Rückgabe der bisher geladenen
    
    def extract_basisdaten(self, regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extrahiert Basisdaten aus den Regionsdaten"""
        print("🔍 Extrahiere Basisdaten...")
        
        basisdaten = []
        bundeslaender_map = {}  # Cache für Bundesland-Namen
        
        # Erst alle Bundesländer sammeln für Mapping
        for region in regions:
            if region.get('type') == 'BUNDESLAND':
                bundeslaender_map[region.get('ags')] = region.get('name')
        
        for region in regions:
            region_type = region.get('type')
            
            # Nur relevante Typen verarbeiten
            if region_type not in ['GEMEINDE', 'LANDKREIS', 'KREISFREIE_STADT', 'BUNDESLAND']:
                continue
                
            # Bundesland bestimmen
            bundesland = self._get_bundesland(region, bundeslaender_map)
            
            basisdatum = {
                'id': region.get('id'),
                'name': region.get('name'),
                'bundesland': bundesland,
                'ags': region.get('ags'),
                'ars': region.get('ars'),  
                'kommunaltyp': region_type,
                'verwaltungstyp': self._get_verwaltungstyp(region_type),
                'parent_id': region.get('parentId'),
                'nuts_code': region.get('nutsCode', ''),
                'lau_code': region.get('lauCode', '')
            }
            
            basisdaten.append(basisdatum)
            
        print(f"✅ {len(basisdaten)} Basisdaten extrahiert")
        return basisdaten
    
    def _get_bundesland(self, region: Dict[str, Any], bundeslaender_map: Dict[str, str]) -> str:
        """Bestimmt das Bundesland für eine Region"""
        region_type = region.get('type')
        
        # Wenn es selbst ein Bundesland ist
        if region_type == 'BUNDESLAND':
            return region.get('name', '')
        
        # Für Kreisfreie Städte: Prüfe ob es ein Stadtstaat ist
        if region_type == 'KREISFREIE_STADT':
            name = region.get('name', '')
            if name in ['Berlin', 'Hamburg', 'Bremen']:
                return name
                
        # Für andere: Über AGS-Prefix das Bundesland bestimmen  
        ags = region.get('ags', '')
        if len(ags) >= 2:
            bundesland_prefix = ags[:2]
            
            # Bundesland-Prefixe zu Namen mapping
            bl_mapping = {
                '01': 'Schleswig-Holstein',
                '02': 'Hamburg', 
                '03': 'Niedersachsen',
                '04': 'Bremen',
                '05': 'Nordrhein-Westfalen',
                '06': 'Hessen',
                '07': 'Rheinland-Pfalz',
                '08': 'Baden-Württemberg',
                '09': 'Bayern',
                '10': 'Saarland',
                '11': 'Berlin',
                '12': 'Brandenburg',
                '13': 'Mecklenburg-Vorpommern',
                '14': 'Sachsen',
                '15': 'Sachsen-Anhalt',
                '16': 'Thüringen'
            }
            
            return bl_mapping.get(bundesland_prefix, '')
            
        return ''
    
    def _get_verwaltungstyp(self, kommunaltyp: str) -> str:
        """Bestimmt den Verwaltungstyp basierend auf Kommunaltyp"""
        verwaltungstypen = {
            'BUNDESLAND': 'Landesregierung',
            'LANDKREIS': 'Kreisverwaltung', 
            'KREISFREIE_STADT': 'Stadtverwaltung',
            'GEMEINDE': 'Gemeindeverwaltung'
        }
        return verwaltungstypen.get(kommunaltyp, 'Unbekannt')
    
    def save_as_json(self, basisdaten: List[Dict[str, Any]], filename: str):
        """Speichert Basisdaten als JSON"""
        output_data = {
            'metadata': {
                'extraction_date': datetime.now().isoformat(),
                'source': 'Wegweiser Kommune API',
                'total_entries': len(basisdaten),
                'types_count': self._count_types(basisdaten)
            },
            'basisdaten': basisdaten
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"💾 JSON gespeichert: {filename}")
    
    def save_as_csv(self, basisdaten: List[Dict[str, Any]], filename: str):
        """Speichert Basisdaten als CSV"""
        if not basisdaten:
            return
            
        fieldnames = basisdaten[0].keys()
        
        with open(filename, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(basisdaten)
        print(f"💾 CSV gespeichert: {filename}")
    
    def _count_types(self, basisdaten: List[Dict[str, Any]]) -> Dict[str, int]:
        """Zählt die verschiedenen Kommunaltypen"""
        counts = {}
        for item in basisdaten:
            typ = item.get('kommunaltyp', 'Unbekannt')
            counts[typ] = counts.get(typ, 0) + 1
        return counts
    
    def print_statistics(self, basisdaten: List[Dict[str, Any]]):
        """Zeigt Statistiken der extrahierten Basisdaten"""
        print("\n📊 BASISDATEN STATISTIKEN")
        print("=" * 50)
        
        total = len(basisdaten)
        print(f"Gesamt: {total:,} Einträge")
        
        # Nach Typ
        type_counts = self._count_types(basisdaten)
        print(f"\nNach Kommunaltyp:")
        for typ, count in sorted(type_counts.items()):
            percentage = (count / total) * 100
            print(f"  {typ:20}: {count:6,} ({percentage:5.1f}%)")
        
        # Nach Bundesland
        bl_counts = {}
        for item in basisdaten:
            bl = item.get('bundesland', 'Unbekannt')
            bl_counts[bl] = bl_counts.get(bl, 0) + 1
            
        print(f"\nNach Bundesland (Top 5):")
        for bl, count in sorted(bl_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
            percentage = (count / total) * 100
            print(f"  {bl:20}: {count:6,} ({percentage:5.1f}%)")

def main():
    print("🏛️ WEGWEISER KOMMUNE - BASISDATEN EXTRAKTION")
    print("=" * 60)
    
    extractor = BasisdatenExtractor()
    
    # 1. Lade alle Regionen
    regions = extractor.get_all_regions()
    if not regions:
        print("❌ Keine Regionen geladen - Abbruch")
        return
    
    # 2. Extrahiere Basisdaten
    basisdaten = extractor.extract_basisdaten(regions)
    if not basisdaten:
        print("❌ Keine Basisdaten extrahiert - Abbruch")
        return
    
    # 3. Statistiken anzeigen
    extractor.print_statistics(basisdaten)
    
    # 4. Speichern
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    json_filename = f"/home/basti/projects/knot-dots/wegweiser/data/basisdaten_{timestamp}.json"
    csv_filename = f"/home/basti/projects/knot-dots/wegweiser/data/basisdaten_{timestamp}.csv"
    
    extractor.save_as_json(basisdaten, json_filename)
    extractor.save_as_csv(basisdaten, csv_filename)
    
    # 5. Auch aktuelle Version speichern (ohne Timestamp)
    extractor.save_as_json(basisdaten, "/home/basti/projects/knot-dots/wegweiser/data/basisdaten_aktuell.json")
    extractor.save_as_csv(basisdaten, "/home/basti/projects/knot-dots/wegweiser/data/basisdaten_aktuell.csv")
    
    print(f"\n✅ Basisdaten-Extraktion abgeschlossen!")
    print(f"📂 Dateien erstellt:")
    print(f"   • JSON (mit Timestamp): {json_filename}")
    print(f"   • CSV (mit Timestamp): {csv_filename}")
    print(f"   • JSON (aktuell): basisdaten_aktuell.json")
    print(f"   • CSV (aktuell): basisdaten_aktuell.csv")

if __name__ == "__main__":
    main()