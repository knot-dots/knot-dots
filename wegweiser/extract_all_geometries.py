#!/usr/bin/env python3
"""
Extract all geometries from Wegweiser Kommune API
Extracts all administrative levels: Bundesländer, Landkreise, Kreisfreie Städte, Gemeinden
"""

import requests
import json
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime

class WegweiserFullExtractor:
    def __init__(self, base_url: str = "https://www.wegweiser-kommune.de/data-api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Geodata Extractor for knot-dots project',
            'Accept': 'application/json'
        })
        self.extraction_log = []
    
    def log_step(self, message: str):
        """Log extraction steps with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        self.extraction_log.append(log_entry)
    
    def get_regions_by_type(self, region_type: str) -> List[Dict]:
        """Get all regions of a specific type"""
        self.log_step(f"Fetching {region_type} regions...")
        
        url = f"{self.base_url}/rest/region/list"
        params = {
            'types': [region_type],
            'max': 15000  # High limit to get all regions
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            regions = response.json()
            self.log_step(f"Found {len(regions)} {region_type} regions")
            
            return regions
            
        except requests.exceptions.RequestException as e:
            self.log_step(f"Error fetching {region_type}: {e}")
            return []
    
    def extract_geometries_by_layer(self, layer_type: str, region_ids: List[int] = None) -> Optional[Dict]:
        """Extract geometries for a specific layer"""
        self.log_step(f"Extracting geometries for layer {layer_type}...")
        
        url = f"{self.base_url}/rest/map/data"
        
        # If no specific region IDs provided, try to get all for this layer
        if not region_ids:
            payload = {"layer": layer_type}
        else:
            payload = {
                "regionIds": region_ids,
                "layer": layer_type
            }
        
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            map_data = response.json()
            
            if 'regions' in map_data:
                features = map_data['regions'].get('features', [])
                self.log_step(f"Extracted {len(features)} features for {layer_type}")
                return map_data
            else:
                self.log_step(f"No 'regions' field in {layer_type} response")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_step(f"Error extracting {layer_type} geometries: {e}")
            return None
    
    def extract_geometries_alternative(self, region_ids: List[int], batch_size: int = 100) -> List[Dict]:
        """Alternative: extract geometries in batches via individual region requests"""
        all_features = []
        batches = [region_ids[i:i+batch_size] for i in range(0, len(region_ids), batch_size)]
        
        self.log_step(f"Using alternative extraction with {len(batches)} batches of max {batch_size} regions")
        
        for i, batch in enumerate(batches):
            self.log_step(f"Processing batch {i+1}/{len(batches)} ({len(batch)} regions)...")
            
            url = f"{self.base_url}/rest/map/data"
            payload = {"regionIds": batch}
            
            try:
                response = self.session.post(url, json=payload)
                response.raise_for_status()
                
                map_data = response.json()
                if 'regions' in map_data:
                    batch_features = map_data['regions'].get('features', [])
                    all_features.extend(batch_features)
                    self.log_step(f"Batch {i+1}: Got {len(batch_features)} features")
                
                # Be nice to the API
                time.sleep(0.5)
                
            except requests.exceptions.RequestException as e:
                self.log_step(f"Error in batch {i+1}: {e}")
                continue
        
        return all_features
    
    def save_geojson(self, features: List[Dict], filename: str, metadata: Dict = None) -> bool:
        """Save features as GeoJSON with proper structure"""
        self.log_step(f"Saving {len(features)} features to {filename}...")
        
        try:
            # Calculate bounding box
            bbox = self.calculate_bbox(features)
            
            geojson = {
                "type": "FeatureCollection",
                "bbox": bbox,
                "features": features
            }
            
            # Add metadata as properties if provided
            if metadata:
                geojson["metadata"] = metadata
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            
            self.log_step(f"Successfully saved {filename} ({len(features)} features)")
            return True
            
        except Exception as e:
            self.log_step(f"Error saving {filename}: {e}")
            return False
    
    def calculate_bbox(self, features: List[Dict]) -> List[float]:
        """Calculate bounding box for features"""
        if not features:
            return [0, 0, 0, 0]
        
        min_lon, min_lat = float('inf'), float('inf')
        max_lon, max_lat = float('-inf'), float('-inf')
        
        for feature in features:
            if 'geometry' not in feature or not feature['geometry']:
                continue
                
            coords = feature['geometry'].get('coordinates', [])
            if not coords:
                continue
            
            # Extract coordinates recursively
            flat_coords = self.flatten_coordinates(coords)
            
            for coord in flat_coords:
                if len(coord) >= 2:
                    lon, lat = coord[0], coord[1]
                    min_lon, max_lon = min(min_lon, lon), max(max_lon, lon)
                    min_lat, max_lat = min(min_lat, lat), max(max_lat, lat)
        
        return [min_lon, min_lat, max_lon, max_lat]
    
    def flatten_coordinates(self, coords) -> List[List[float]]:
        """Recursively flatten coordinate arrays"""
        result = []
        if not coords:
            return result
            
        if isinstance(coords[0], (int, float)):
            # This is a coordinate pair
            return [coords]
        
        for item in coords:
            result.extend(self.flatten_coordinates(item))
        
        return result
    
    def extract_all_administrative_levels(self) -> Dict[str, str]:
        """Extract all administrative levels and return filenames"""
        results = {}
        
        self.log_step("=== Starting Full Geometries Extraction ===")
        
        # Define extraction plan
        extraction_plan = [
            {
                "name": "Bundesländer (States)",
                "region_types": ["BUNDESLAND", "KREISFREIE_STADT"],  # Include city-states 
                "layer": "STATE",
                "filename": "geometries_bundeslaender.geojson",
                "filter_city_states": True
            },
            {
                "name": "Landkreise (Districts)", 
                "region_types": ["LANDKREIS"],
                "layer": "DISTRICT",
                "filename": "geometries_landkreise.geojson",
                "filter_city_states": False
            },
            {
                "name": "Kreisfreie Städte (Independent Cities)",
                "region_types": ["KREISFREIE_STADT"],
                "layer": "COMMUNE", 
                "filename": "geometries_kreisfreie_staedte.geojson",
                "filter_city_states": False
            },
            {
                "name": "Gemeinden (Municipalities)",
                "region_types": ["GEMEINDE"],
                "layer": "COMMUNE",
                "filename": "geometries_gemeinden.geojson", 
                "filter_city_states": False
            }
        ]
        
        for plan in extraction_plan:
            self.log_step(f"\n--- Extracting {plan['name']} ---")
            
            # Collect all regions of the specified types
            all_regions = []
            for region_type in plan['region_types']:
                regions = self.get_regions_by_type(region_type)
                all_regions.extend(regions)
            
            if not all_regions:
                self.log_step(f"No regions found for {plan['name']}")
                continue
            
            # Filter city-states if needed (for Bundesländer extraction)
            if plan['filter_city_states']:
                # Keep only actual Bundesländer + the city-states Berlin, Hamburg
                city_state_ags = ['11000000', '02000000', '04000000']  # Berlin, Hamburg, Bremen
                filtered_regions = []
                
                for region in all_regions:
                    # Keep all BUNDESLAND types
                    if region.get('type') == 'BUNDESLAND':
                        filtered_regions.append(region)
                    # Keep city-states (Berlin, Hamburg) from KREISFREIE_STADT
                    elif region.get('type') == 'KREISFREIE_STADT' and region.get('ags') in city_state_ags[:2]:  # Only Berlin, Hamburg
                        filtered_regions.append(region)
                
                all_regions = filtered_regions
                self.log_step(f"Filtered to {len(all_regions)} Bundesländer (including city-states)")
            
            # Extract region IDs
            region_ids = [r['id'] for r in all_regions if 'id' in r]
            self.log_step(f"Using {len(region_ids)} region IDs")
            
            # Try direct layer extraction first
            map_data = self.extract_geometries_by_layer(plan['layer'], region_ids)
            
            features = []
            if map_data and 'regions' in map_data:
                features = map_data['regions'].get('features', [])
            
            # If direct method failed or returned insufficient results, try alternative
            if len(features) < len(region_ids) * 0.8:  # If we got less than 80% of expected
                self.log_step(f"Direct extraction incomplete ({len(features)}/{len(region_ids)}), trying alternative...")
                features = self.extract_geometries_alternative(region_ids)
            
            if features:
                # Prepare metadata
                metadata = {
                    "extraction_date": datetime.now().isoformat(),
                    "layer_type": plan['layer'],
                    "region_types": plan['region_types'],
                    "total_features": len(features),
                    "total_regions_requested": len(region_ids)
                }
                
                # Save results
                if self.save_geojson(features, plan['filename'], metadata):
                    results[plan['name']] = plan['filename']
                    
                    # Quick validation
                    self.validate_extraction(features, plan['name'], len(region_ids))
            else:
                self.log_step(f"No features extracted for {plan['name']}")
        
        return results
    
    def validate_extraction(self, features: List[Dict], extraction_name: str, expected_count: int):
        """Validate extraction results"""
        self.log_step(f"Validating {extraction_name}...")
        
        if len(features) == 0:
            self.log_step(f"❌ No features extracted for {extraction_name}")
            return
        
        # Count by type
        type_counts = {}
        for feature in features:
            region_type = feature.get('properties', {}).get('type', 'Unknown')
            type_counts[region_type] = type_counts.get(region_type, 0) + 1
        
        self.log_step(f"Extracted {len(features)} features:")
        for region_type, count in type_counts.items():
            self.log_step(f"  - {region_type}: {count}")
        
        # Check completeness
        completeness = len(features) / expected_count * 100 if expected_count > 0 else 0
        if completeness >= 90:
            self.log_step(f"✅ Extraction complete ({completeness:.1f}%)")
        else:
            self.log_step(f"⚠️ Potentially incomplete ({completeness:.1f}%)")
    
    def save_extraction_log(self):
        """Save extraction log to file"""
        log_filename = f"extraction_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        try:
            with open(log_filename, 'w', encoding='utf-8') as f:
                f.write("Wegweiser Kommune - Full Geometries Extraction Log\n")
                f.write("=" * 60 + "\n\n")
                f.write("\n".join(self.extraction_log))
            
            self.log_step(f"Extraction log saved to {log_filename}")
            
        except Exception as e:
            self.log_step(f"Error saving log: {e}")

def main():
    print("=== Wegweiser Kommune: Full Geometries Extractor ===\n")
    
    extractor = WegweiserFullExtractor()
    
    # Extract all administrative levels
    results = extractor.extract_all_administrative_levels()
    
    # Summary
    extractor.log_step("\n=== Extraction Summary ===")
    if results:
        for extraction_name, filename in results.items():
            extractor.log_step(f"✅ {extraction_name}: {filename}")
    else:
        extractor.log_step("❌ No successful extractions")
    
    # Save log
    extractor.save_extraction_log()
    
    extractor.log_step("\n=== Extraction completed ===")

if __name__ == "__main__":
    main()