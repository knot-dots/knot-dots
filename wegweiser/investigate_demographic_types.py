#!/usr/bin/env python3
"""
Wegweiser Kommune - Demographic Types Investigation
Untersucht die verfügbaren Demografietypen in der API mit Focus auf "G2.2 Mittelstadt, stabil"
"""

import requests
import json
import time
from typing import Dict, List, Any
from datetime import datetime

class DemographicTypesInvestigator:
    def __init__(self, base_url: str = "https://www.wegweiser-kommune.de/data-api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'DemographicTypes-Investigator/1.0',
            'Accept': 'application/json'
        })
        
    def get_all_demographic_types(self) -> List[Dict[str, Any]]:
        """Lädt alle Demografietypen über /rest/demographicTypes"""
        print("🔍 Lade alle Demografietypen...")
        
        try:
            response = self.session.get(f"{self.base_url}/rest/demographicTypes")
            response.raise_for_status()
            demographic_types = response.json()
            
            print(f"✅ {len(demographic_types)} Demografietypen gefunden")
            return demographic_types if isinstance(demographic_types, list) else []
            
        except requests.RequestException as e:
            print(f"❌ Fehler beim Laden der Demografietypen: {e}")
            return []
    
    def get_demographic_type_by_number(self, number: int) -> Dict[str, Any]:
        """Lädt einen spezifischen Demografietyp über /rest/demographicTypes/{number}"""
        print(f"🔍 Lade Demografietyp {number}...")
        
        try:
            response = self.session.get(f"{self.base_url}/rest/demographicTypes/{number}")
            response.raise_for_status()
            demographic_type = response.json()
            
            print(f"✅ Demografietyp {number} geladen")
            return demographic_type if isinstance(demographic_type, dict) else {}
            
        except requests.RequestException as e:
            print(f"❌ Fehler beim Laden des Demografietyps {number}: {e}")
            return {}
    
    def suggest_demographic_types(self, search_term: str = "") -> List[Dict[str, Any]]:
        """Sucht Demografietypen über /rest/suggest/demographicType"""
        print(f"🔍 Suche Demografietypen mit Begriff: '{search_term}'")
        
        try:
            params = {'search': search_term, 'max': 50}
            response = self.session.get(f"{self.base_url}/rest/suggest/demographicType", params=params)
            response.raise_for_status()
            suggestions = response.json()
            
            print(f"✅ {len(suggestions)} Vorschläge gefunden")
            return suggestions if isinstance(suggestions, list) else []
            
        except requests.RequestException as e:
            print(f"❌ Fehler bei der Suche: {e}")
            return []
    
    def find_mittelstadt_types(self, demographic_types: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Findet alle Demografietypen die mit Mittelstadt zu tun haben"""
        print("🔍 Suche nach Mittelstadt-bezogenen Demografietypen...")
        
        mittelstadt_types = []
        search_terms = ['mittelstadt', 'G2', 'stabil', 'mittlere', 'medium']
        
        for dem_type in demographic_types:
            name = dem_type.get('name', '').lower()
            title = dem_type.get('title', '').lower()
            
            # Suche in Name und Title
            for term in search_terms:
                if term in name or term in title:
                    mittelstadt_types.append(dem_type)
                    break
        
        print(f"✅ {len(mittelstadt_types)} Mittelstadt-relevante Typen gefunden")
        return mittelstadt_types
    
    def analyze_existing_data(self) -> Dict[str, Any]:
        """Analysiert vorhandene Daten nach demographicType Werten"""
        print("🔍 Analysiere vorhandene Daten...")
        
        analysis = {
            'demographic_type_numbers': set(),
            'demographic_type_descriptions': set(),
            'kommunaltyp_stats': {}
        }
        
        # Lade test-cities-dataset.json
        try:
            with open('/home/basti/projects/knot-dots/wegweiser/data/test-cities-dataset.json', 'r', encoding='utf-8') as f:
                test_data = json.load(f)
                
            for city in test_data:
                # Sammle demographicType Nummern
                if 'demographicType' in city and isinstance(city['demographicType'], str):
                    analysis['demographic_type_descriptions'].add(city['demographicType'])
                
                # Sammle kommunaltyp Statistiken
                kommunaltyp = city.get('kommunaltyp', 'Unbekannt')
                analysis['kommunaltyp_stats'][kommunaltyp] = analysis['kommunaltyp_stats'].get(kommunaltyp, 0) + 1
                    
        except Exception as e:
            print(f"⚠️ Fehler beim Lesen der test-cities-dataset.json: {e}")
        
        # Lade geometrie-Dateien für demographicType Nummern
        geometry_files = [
            '/home/basti/projects/knot-dots/wegweiser/data/geometries_bundeslaender.geojson',
            '/home/basti/projects/knot-dots/wegweiser/data/geometries_landkreise.geojson',
            '/home/basti/projects/knot-dots/wegweiser/data/geometries_kreisfreie_staedte.geojson'
        ]
        
        for file_path in geometry_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    geo_data = json.load(f)
                    
                for feature in geo_data.get('features', []):
                    props = feature.get('properties', {})
                    if 'demographicType' in props and isinstance(props['demographicType'], int):
                        analysis['demographic_type_numbers'].add(props['demographicType'])
                        
            except Exception as e:
                print(f"⚠️ Fehler beim Lesen von {file_path}: {e}")
        
        return analysis
    
    def print_analysis_results(self, analysis: Dict[str, Any]):
        """Zeigt Analyseergebnisse"""
        print("\n📊 ANALYSE DER VORHANDENEN DATEN")
        print("=" * 50)
        
        print(f"\n🔢 Demografietyp-Nummern (aus GeoJSON):")
        for num in sorted(analysis['demographic_type_numbers']):
            print(f"  Typ {num}")
        
        print(f"\n📝 Demografietyp-Beschreibungen (aus test-dataset):")
        for desc in sorted(analysis['demographic_type_descriptions']):
            print(f"  • {desc}")
        
        print(f"\n🏛️ Kommunaltyp-Statistik:")
        for kommunaltyp, count in sorted(analysis['kommunaltyp_stats'].items()):
            print(f"  {kommunaltyp}: {count}")
    
    def search_for_g2_mittelstadt(self, demographic_types: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Spezifische Suche nach G2.2 Mittelstadt, stabil"""
        print("🎯 Spezifische Suche nach 'G2.2 Mittelstadt, stabil'...")
        
        matches = []
        
        # Direkte Suche in Namen und Titeln
        for dem_type in demographic_types:
            name = dem_type.get('name', '')
            title = dem_type.get('title', '')
            number = dem_type.get('number', 0)
            
            # Prüfe verschiedene Varianten
            if any(term in name.lower() for term in ['g2', '2.2', 'mittelstadt']):
                matches.append(dem_type)
            elif any(term in title.lower() for term in ['g2', '2.2', 'mittelstadt', 'stabil']):
                matches.append(dem_type)
        
        print(f"✅ {len(matches)} Treffer für G2.2 Mittelstadt gefunden")
        return matches
    
    def save_results(self, all_types: List[Dict[str, Any]], analysis: Dict[str, Any]):
        """Speichert die Ergebnisse"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Konvertiere Sets zu Lists für JSON
        analysis_serializable = {
            'demographic_type_numbers': list(analysis['demographic_type_numbers']),
            'demographic_type_descriptions': list(analysis['demographic_type_descriptions']),
            'kommunaltyp_stats': analysis['kommunaltyp_stats']
        }
        
        output_data = {
            'metadata': {
                'extraction_date': datetime.now().isoformat(),
                'source': 'Wegweiser Kommune API /rest/demographicTypes',
                'total_demographic_types': len(all_types),
                'analysis': analysis_serializable
            },
            'demographic_types': all_types
        }
        
        filename = f"/home/basti/projects/knot-dots/wegweiser/data/demographic_types_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Ergebnisse gespeichert: {filename}")

def main():
    print("🔍 WEGWEISER KOMMUNE - DEMOGRAFIETYPEN UNTERSUCHUNG")
    print("=" * 60)
    print("🎯 Fokus: G2.2 Mittelstadt, stabil Klassifikation")
    print()
    
    investigator = DemographicTypesInvestigator()
    
    # 1. Analysiere vorhandene Daten
    print("📋 Phase 1: Analyse vorhandener Daten")
    analysis = investigator.analyze_existing_data()
    investigator.print_analysis_results(analysis)
    
    # 2. Lade alle Demografietypen von der API
    print("\n📋 Phase 2: API-Daten laden")
    all_demographic_types = investigator.get_all_demographic_types()
    
    if not all_demographic_types:
        print("❌ Keine Demografietypen von der API erhalten - Abbruch")
        return
    
    # 3. Zeige alle Demografietypen
    print(f"\n📊 Alle {len(all_demographic_types)} Demografietypen:")
    for dem_type in all_demographic_types:
        number = dem_type.get('number', 'N/A')
        name = dem_type.get('name', 'N/A')
        title = dem_type.get('title', 'N/A')
        print(f"  Typ {number}: {name}")
        if title != name:
            print(f"    → {title}")
    
    # 4. Suche nach Mittelstadt-relevanten Typen
    print(f"\n📋 Phase 3: Mittelstadt-Suche")
    mittelstadt_types = investigator.find_mittelstadt_types(all_demographic_types)
    
    if mittelstadt_types:
        print("🎯 Mittelstadt-relevante Demografietypen:")
        for dem_type in mittelstadt_types:
            number = dem_type.get('number', 'N/A')
            name = dem_type.get('name', 'N/A')
            title = dem_type.get('title', 'N/A')
            print(f"  ✅ Typ {number}: {name}")
            print(f"     → {title}")
            
            # Zeige zusätzliche Infos falls vorhanden
            if 'descriptionFile' in dem_type:
                print(f"     📄 Beschreibung: {dem_type['descriptionFile']}")
            if 'regionsFile' in dem_type:
                print(f"     📊 Regionen: {dem_type['regionsFile']}")
    
    # 5. Spezifische G2.2 Suche
    print(f"\n📋 Phase 4: Spezifische G2.2 Suche")
    g2_matches = investigator.search_for_g2_mittelstadt(all_demographic_types)
    
    if g2_matches:
        print("🎯 G2.2 Mittelstadt Treffer:")
        for dem_type in g2_matches:
            number = dem_type.get('number', 'N/A')
            name = dem_type.get('name', 'N/A')
            title = dem_type.get('title', 'N/A')
            print(f"  ⭐ Typ {number}: {name}")
            print(f"     → {title}")
    else:
        print("❌ Keine direkten Treffer für 'G2.2 Mittelstadt, stabil'")
    
    # 6. Teste Suggest-Funktion
    print(f"\n📋 Phase 5: Suggest-API testen")
    for search_term in ['mittelstadt', 'G2', 'stabil', 'mittlere']:
        suggestions = investigator.suggest_demographic_types(search_term)
        if suggestions:
            print(f"💡 Vorschläge für '{search_term}':")
            for sugg in suggestions[:3]:  # Nur erste 3 zeigen
                print(f"  • {sugg.get('name', 'N/A')}")
    
    # 7. Speichere Ergebnisse
    print(f"\n📋 Phase 6: Ergebnisse speichern")
    investigator.save_results(all_demographic_types, analysis)
    
    print(f"\n✅ Untersuchung abgeschlossen!")
    
    # Fazit
    print(f"\n🎯 FAZIT")
    print("=" * 30)
    print(f"• {len(all_demographic_types)} Demografietypen insgesamt verfügbar")
    print(f"• {len(mittelstadt_types)} davon Mittelstadt-relevant")
    print(f"• {len(g2_matches)} direkte G2.2-Treffer")
    
    if not g2_matches and not mittelstadt_types:
        print("❓ Möglicherweise verwendet die API andere Bezeichnungen")
        print("❓ 'G2.2 Mittelstadt, stabil' könnte:")
        print("   • Ein alter/veralteter Begriff sein")
        print("   • Unter anderem Namen klassifiziert sein")
        print("   • Nur in speziellen Dokumenten erwähnt werden")

if __name__ == "__main__":
    main()