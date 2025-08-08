#!/usr/bin/env python3
"""
Extract Bundesländer (German States) geometries from Wegweiser Kommune API
Only extracts geometry data without statistical indicators.
"""

import requests
import json
import time
from typing import Dict, List, Optional

class WegweiserExtractor:
    def __init__(self, base_url: str = "https://www.wegweiser-kommune.de/data-api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Geodata Extractor for knot-dots project',
            'Accept': 'application/json'
        })
    
    def extract_bundeslaender_metadata(self) -> List[Dict]:
        """Extract all Bundesländer metadata from /rest/region/list"""
        print("Extracting Bundesländer metadata...")
        
        url = f"{self.base_url}/rest/region/list"
        params = {
            'types': ['BUNDESLAND'],
            'max': 20  # Should cover all 16 Bundesländer
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            bundeslaender = response.json()
            print(f"Found {len(bundeslaender)} Bundesländer")
            
            for bl in bundeslaender:
                print(f"  - {bl['name']} (AGS: {bl['ags']}, ID: {bl.get('id', 'N/A')})")
            
            return bundeslaender
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching Bundesländer metadata: {e}")
            return []
    
    def extract_bundeslaender_geometries(self) -> Optional[Dict]:
        """Extract Bundesländer geometries from /rest/map/data"""
        print("Extracting Bundesländer geometries...")
        
        # First, get metadata to build region IDs list
        bundeslaender = self.extract_bundeslaender_metadata()
        if not bundeslaender:
            return None
        
        # Extract region IDs
        region_ids = [bl['id'] for bl in bundeslaender if 'id' in bl]
        
        if not region_ids:
            print("No region IDs found, trying alternative approach...")
            return self._extract_geometries_alternative()
        
        print(f"Using region IDs: {region_ids}")
        
        url = f"{self.base_url}/rest/map/data"
        payload = {
            "regionIds": region_ids,
            "layer": "STATE"
        }
        
        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            
            map_data = response.json()
            
            if 'regions' in map_data:
                features = map_data['regions']
                print(f"Extracted {len(features.get('features', []))} geometry features")
                return map_data
            else:
                print("No 'regions' field in response, trying alternative...")
                return self._extract_geometries_alternative()
                
        except requests.exceptions.RequestException as e:
            print(f"Error fetching geometries: {e}")
            return self._extract_geometries_alternative()
    
    def _extract_geometries_alternative(self) -> Optional[Dict]:
        """Alternative approach: Use GET endpoint with empty friendlyUrl"""
        print("Trying alternative geometry extraction...")
        
        url = f"{self.base_url}/rest/map/data/"
        params = {
            'layer': 'STATE'
        }
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            
            map_data = response.json()
            print(f"Alternative approach successful")
            return map_data
            
        except requests.exceptions.RequestException as e:
            print(f"Alternative approach failed: {e}")
            return None
    
    def save_geojson(self, map_data: Dict, filename: str = "bundeslaender.geojson") -> bool:
        """Save the geometry data as GeoJSON file"""
        print(f"Saving geometries to {filename}...")
        
        try:
            # Extract the FeatureCollection from the regions field
            if 'regions' in map_data and isinstance(map_data['regions'], dict):
                geojson = map_data['regions']
            else:
                # If regions is not a proper FeatureCollection, wrap the whole response
                geojson = map_data
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            
            print(f"Successfully saved {filename}")
            return True
            
        except Exception as e:
            print(f"Error saving GeoJSON: {e}")
            return False
    
    def validate_completeness(self, map_data: Dict) -> bool:
        """Validate that we have all 16 Bundesländer"""
        print("Validating completeness...")
        
        if 'regions' not in map_data:
            print("No 'regions' field found")
            return False
        
        features = map_data['regions'].get('features', [])
        
        print(f"Found {len(features)} features")
        
        # List features for verification
        for i, feature in enumerate(features):
            props = feature.get('properties', {})
            name = props.get('name', f'Feature {i}')
            ags = props.get('ags', 'N/A')
            print(f"  - {name} (AGS: {ags})")
        
        # Check if we have approximately 16 Bundesländer
        if len(features) >= 16:
            print("✓ Completeness check passed")
            return True
        else:
            print(f"⚠ Expected ~16 Bundesländer, got {len(features)}")
            return False

def main():
    print("=== Wegweiser Kommune: Bundesländer Geometry Extractor ===\n")
    
    extractor = WegweiserExtractor()
    
    # Extract geometries
    map_data = extractor.extract_bundeslaender_geometries()
    
    if not map_data:
        print("Failed to extract geometries")
        return
    
    # Save as GeoJSON
    if extractor.save_geojson(map_data):
        print("✓ Geometries saved successfully")
    
    # Validate
    extractor.validate_completeness(map_data)
    
    print("\n=== Extraction completed ===")

if __name__ == "__main__":
    main()