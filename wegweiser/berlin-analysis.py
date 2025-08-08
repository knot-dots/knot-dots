#!/usr/bin/env python3
"""
Analyse der Berlin Bevölkerungsdaten als knot-dots Integrations-Beispiel
Zeigt die Transformation und Besonderheiten eines Stadtstaats.
"""

import json
from datetime import datetime

def load_berlin_data():
    """Lade den Berlin Beispieldatensatz"""
    with open('/home/basti/projects/knot-dots/knowledge/berlin-population-example.json', 'r', encoding='utf-8') as f:
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

def identify_growth_phases(data):
    """Identifiziere Wachstumsphasen"""
    historical_values = data['historicalValues']
    annual_changes = []
    
    for i in range(1, len(historical_values)):
        prev_pop = historical_values[i-1][1]
        curr_pop = historical_values[i][1]
        change = curr_pop - prev_pop
        annual_changes.append({
            'year': historical_values[i][0],
            'change': change
        })
    
    # Identifiziere Phasen
    phases = []
    current_phase = None
    
    for change_data in annual_changes:
        year = change_data['year']
        change = change_data['change']
        
        if change > 10000:  # Starkes Wachstum
            phase_type = 'strong_growth'
        elif change > 0:    # Moderates Wachstum
            phase_type = 'moderate_growth'
        else:              # Rückgang
            phase_type = 'decline'
        
        if current_phase is None or current_phase['type'] != phase_type:
            if current_phase:
                phases.append(current_phase)
            current_phase = {
                'type': phase_type,
                'start_year': year,
                'end_year': year,
                'total_change': change
            }
        else:
            current_phase['end_year'] = year
            current_phase['total_change'] += change
    
    if current_phase:
        phases.append(current_phase)
    
    return phases

def print_analysis(data):
    """Ausgabe der Analyse"""
    stats, annual_changes = analyze_population_trend(data)
    phases = identify_growth_phases(data)
    
    print("="*60)
    print(f"🏛️ BEVÖLKERUNGSANALYSE: {data['regionName']} (Stadtstaat)")
    print("="*60)
    
    print(f"\n🌃 Stadt-Information:")
    print(f"   Name: {data['regionName']}")
    print(f"   AGS: {data['regionAgs']}")
    print(f"   Status: {data['regionType']} ⚠️ (API-Klassifizierung)")
    print(f"   Tatsächlicher Status: Bundesland (Stadtstaat)")
    print(f"   Hauptstadt: ✅")
    print(f"   Demografietyp: {data.get('demographicType', 'N/A')}")
    print(f"   Quelle: {data['source']}")
    
    print(f"\n📈 Zeitreihen-Statistiken:")
    print(f"   Zeitraum: {stats['start_year']} - {stats['end_year']} ({stats['total_years']} Jahre)")
    print(f"   Start-Bevölkerung: {stats['start_population']:,} Einwohner ({stats['start_year']})")
    print(f"   End-Bevölkerung: {stats['end_population']:,} Einwohner ({stats['end_year']})")
    print(f"   Durchschnitt: {stats['average_population']:,.0f} Einwohner")
    
    print(f"\n📊 Extremwerte:")
    print(f"   Maximum: {stats['max_population']:,} Einwohner ({stats['max_year']})")
    print(f"   Minimum: {stats['min_population']:,} Einwohner ({stats['min_year']})")
    
    print(f"\n📈 Gesamtveränderung:")
    print(f"   Absolut: {stats['total_change']:+,} Einwohner")
    print(f"   Relativ: {stats['total_change_percent']:+.2f}%")
    print(f"   Ø jährlich: {stats['total_change']/17:+,.0f} Einwohner/Jahr")
    
    print(f"\n🎯 Wachstumsphasen:")
    phase_names = {
        'strong_growth': 'Starkes Wachstum (>10k/Jahr)',
        'moderate_growth': 'Moderates Wachstum',
        'decline': 'Rückgang'
    }
    
    for phase in phases:
        phase_name = phase_names.get(phase['type'], phase['type'])
        duration = phase['end_year'] - phase['start_year'] + 1
        if duration == 1:
            period = str(phase['start_year'])
        else:
            period = f"{phase['start_year']}-{phase['end_year']}"
        
        print(f"   📅 {period}: {phase_name}")
        print(f"      Gesamtveränderung: {phase['total_change']:+,} Einwohner")
        if duration > 1:
            avg_change = phase['total_change'] / duration
            print(f"      Ø pro Jahr: {avg_change:+,.0f} Einwohner")
    
    print(f"\n📅 Größte jährliche Veränderungen:")
    # Sortiere nach absoluter Veränderung
    sorted_changes = sorted(annual_changes, key=lambda x: abs(x['change_absolute']), reverse=True)
    
    print("   Größte Zuwächse:")
    increases = [c for c in sorted_changes if c['change_absolute'] > 0][:5]
    for change in increases:
        print(f"     {change['year']}: {change['change_absolute']:+,} ({change['change_percent']:+.2f}%)")
    
    if any(c['change_absolute'] < 0 for c in annual_changes):
        print("   Rückgänge:")
        decreases = [c for c in sorted_changes if c['change_absolute'] < 0][:3]
        for change in decreases:
            print(f"     {change['year']}: {change['change_absolute']:+,} ({change['change_percent']:+.2f}%)")

def compare_with_germany(data):
    """Vergleiche mit Deutschland (falls Daten verfügbar)"""
    print(f"\n🇩🇪 Berlin im Kontext:")
    
    # Geschätzte Anteile (basierend auf ~83M Deutschland Gesamtbevölkerung)
    berlin_2023 = data['historicalValues'][-1][1]
    berlin_2006 = data['historicalValues'][0][1]
    
    germany_approx_2023 = 84_000_000  # Ungefähre deutsche Gesamtbevölkerung
    germany_approx_2006 = 82_500_000
    
    share_2023 = (berlin_2023 / germany_approx_2023) * 100
    share_2006 = (berlin_2006 / germany_approx_2006) * 100
    
    print(f"   Anteil an Gesamtbevölkerung Deutschland:")
    print(f"     2006: ~{share_2006:.2f}%")
    print(f"     2023: ~{share_2023:.2f}%")
    print(f"     Veränderung: {share_2023 - share_2006:+.2f} Prozentpunkte")
    
    print(f"   Größenvergleich:")
    print(f"     Größte Stadt Deutschlands: ✅")
    print(f"     Bevölkerungsdichte: ~4.000 Einw./km² (geschätzt)")
    print(f"     Status: Stadtstaat (wie Hamburg, Bremen)")

def demonstrate_queries(data):
    """Zeige typische Abfrage-Patterns"""
    historical_values = data['historicalValues']
    
    print(f"\n🔍 Beispiel-Abfragen (Berlin-spezifisch):")
    print("="*60)
    
    # Aktueller Wert
    current_value = historical_values[-1]
    print(f"📊 Aktuelle Einwohnerzahl: {current_value[1]:,} ({current_value[0]})")
    
    # Millionenmarken
    milestones = [3500000, 3600000, 3700000]
    print(f"📈 Millionenmarken:")
    for milestone in milestones:
        milestone_year = None
        for year, population in historical_values:
            if population >= milestone:
                milestone_year = year
                break
        if milestone_year:
            print(f"   {milestone/1000000:.1f} Mio: {milestone_year}")
    
    # Wachstum seit Wiedervereinigung (symbolisch)
    growth_1990_2023 = historical_values[-1][1] - historical_values[0][1]  # 2006 als Proxy
    print(f"📊 Wachstum 2006-2023: {growth_1990_2023:+,} Einwohner")
    
    # Trend der letzten Jahre
    recent_values = historical_values[-5:]
    recent_change = recent_values[-1][1] - recent_values[0][1]
    recent_years = f"{recent_values[0][0]}-{recent_values[-1][0]}"
    print(f"📈 Trend {recent_years}: {recent_change:+,} Einwohner")

def main():
    """Hauptfunktion"""
    print("🚀 Berlin Bevölkerungsdaten - knot-dots Integration Beispiel")
    print(f"⏰ Analyse erstellt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Lade Daten
    data = load_berlin_data()
    
    # Führe Analyse durch
    print_analysis(data)
    
    # Deutschland-Vergleich
    compare_with_germany(data)
    
    # Zeige Abfrage-Beispiele
    demonstrate_queries(data)
    
    print(f"\n✅ Analyse abgeschlossen!")
    print(f"📁 Datensatz: knowledge/berlin-population-example.json")
    print(f"📊 {len(data['historicalValues'])} Datenpunkte für {data['regionName']}")
    print(f"🏛️ Besonderheit: Stadtstaat-Daten in knot-dots Format")

if __name__ == "__main__":
    main()