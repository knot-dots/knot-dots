#!/usr/bin/env python3
"""
Analyse der Lemgo Bevölkerungsdaten als knot-dots Integrations-Beispiel
Zeigt die Transformation und mögliche Analysefunktionen.
"""

import json
from datetime import datetime

def load_lemgo_data():
    """Lade den Lemgo Beispieldatensatz"""
    with open('/home/basti/projects/knot-dots/knowledge/lemgo-population-example.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_population_trend(data):
    """Analysiere Bevölkerungstrend"""
    historical_values = data['historicalValues']
    
    years = [entry[0] for entry in historical_values]
    population = [entry[1] for entry in historical_values]
    
    # Berechne Statistiken
    stats = {
        'total_years': len(years),
        'start_year': min(years),
        'end_year': max(years),
        'start_population': population[0],
        'end_population': population[-1],
        'max_population': max(population),
        'min_population': min(population),
        'max_year': years[population.index(max(population))],
        'min_year': years[population.index(min(population))],
        'total_change': population[-1] - population[0],
        'total_change_percent': ((population[-1] - population[0]) / population[0]) * 100,
        'average_population': sum(population) / len(population)
    }
    
    # Berechne jährliche Veränderungen
    annual_changes = []
    for i in range(1, len(population)):
        change = population[i] - population[i-1]
        change_percent = (change / population[i-1]) * 100
        annual_changes.append({
            'year': years[i],
            'change_absolute': change,
            'change_percent': change_percent
        })
    
    return stats, annual_changes

def print_analysis(data):
    """Ausgabe der Analyse"""
    stats, annual_changes = analyze_population_trend(data)
    
    print("="*60)
    print(f"📊 BEVÖLKERUNGSANALYSE: {data['regionName']}")
    print("="*60)
    
    print(f"\n🏛️ Region Information:")
    print(f"   Name: {data['regionName']}")
    print(f"   AGS: {data['regionAgs']}")
    print(f"   Typ: {data['regionType']}")
    print(f"   Quelle: {data['source']}")
    
    print(f"\n📈 Zeitreihen-Statistiken:")
    print(f"   Zeitraum: {stats['start_year']} - {stats['end_year']} ({stats['total_years']} Jahre)")
    print(f"   Start-Bevölkerung: {stats['start_population']:,} Einwohner ({stats['start_year']})")
    print(f"   End-Bevölkerung: {stats['end_population']:,} Einwohner ({stats['end_year']})")
    print(f"   Durchschnitt: {stats['average_population']:,.0f} Einwohner")
    
    print(f"\n📊 Extremwerte:")
    print(f"   Maximum: {stats['max_population']:,} Einwohner ({stats['max_year']})")
    print(f"   Minimum: {stats['min_population']:,} Einwohner ({stats['min_year']})")
    
    print(f"\n📉 Gesamtveränderung:")
    print(f"   Absolut: {stats['total_change']:+,} Einwohner")
    print(f"   Relativ: {stats['total_change_percent']:+.2f}%")
    
    print(f"\n📅 Größte jährliche Veränderungen:")
    # Sortiere nach absoluter Veränderung
    sorted_changes = sorted(annual_changes, key=lambda x: abs(x['change_absolute']), reverse=True)
    
    print("   Größte Rückgänge:")
    decreases = [c for c in sorted_changes if c['change_absolute'] < 0][:3]
    for change in decreases:
        print(f"     {change['year']}: {change['change_absolute']:+,} ({change['change_percent']:+.2f}%)")
    
    print("   Größte Zuwächse:")
    increases = [c for c in sorted_changes if c['change_absolute'] > 0][:3]
    for change in increases:
        print(f"     {change['year']}: {change['change_absolute']:+,} ({change['change_percent']:+.2f}%)")

def generate_knot_dots_compatible_format(data):
    """Zeigt knot-dots kompatibles Format"""
    
    # Erstelle Beispiel wie es in der knot-dots Datenbank aussehen würde
    container = {
        "guid": "example-guid-lemgo-population", 
        "organization": "wegweiser-kommune",
        "organizationalUnit": None,
        "payloadType": "indicator",
        "managedBy": None,
        "revision": 1,
        "created": datetime.now().isoformat(),
        "updated": datetime.now().isoformat(),
        "payload": data
    }
    
    print(f"\n🔄 knot-dots Container Format:")
    print("="*60)
    print(json.dumps(container, indent=2, ensure_ascii=False, default=str))

def demonstrate_queries(data):
    """Zeige typische Abfrage-Patterns"""
    historical_values = data['historicalValues']
    
    print(f"\n🔍 Beispiel-Abfragen:")
    print("="*60)
    
    # Aktueller Wert
    current_value = historical_values[-1]
    print(f"📊 Aktueller Wert: {current_value[1]:,} Einwohner ({current_value[0]})")
    
    # Wert für spezifisches Jahr
    year_2020 = next((value for year, value in historical_values if year == 2020), None)
    if year_2020:
        print(f"📊 Wert 2020 (Corona-Jahr): {year_2020:,} Einwohner")
    
    # Trend der letzten 5 Jahre
    recent_values = historical_values[-5:]
    recent_change = recent_values[-1][1] - recent_values[0][1]
    recent_years = f"{recent_values[0][0]}-{recent_values[-1][0]}"
    print(f"📈 Trend {recent_years}: {recent_change:+,} Einwohner")
    
    # Durchschnittliche jährliche Veränderung
    total_years = historical_values[-1][0] - historical_values[0][0]
    total_change = historical_values[-1][1] - historical_values[0][1]
    avg_annual_change = total_change / total_years
    print(f"📊 Ø jährliche Veränderung: {avg_annual_change:+.0f} Einwohner/Jahr")

def main():
    """Hauptfunktion"""
    print("🚀 Lemgo Bevölkerungsdaten - knot-dots Integration Beispiel")
    print(f"⏰ Analyse erstellt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Lade Daten
    data = load_lemgo_data()
    
    # Führe Analyse durch
    print_analysis(data)
    
    # Zeige knot-dots Format
    # generate_knot_dots_compatible_format(data)
    
    # Zeige Abfrage-Beispiele
    demonstrate_queries(data)
    
    print(f"\n✅ Analyse abgeschlossen!")
    print(f"📁 Datensatz: knowledge/lemgo-population-example.json")
    print(f"📊 {len(data['historicalValues'])} Datenpunkte für {data['regionName']}")

if __name__ == "__main__":
    main()