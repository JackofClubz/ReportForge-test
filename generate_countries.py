import json
import requests

def generate_countries_json():
    try:
        response = requests.get("https://raw.githubusercontent.com/mledoze/countries/master/countries.json")
        response.raise_for_status()  # Raise an exception for HTTP errors
        countries_data = response.json()

        simplified_countries = []
        for country in countries_data:
            if country.get("name") and country["name"].get("common"):
                simplified_countries.append({
                    "text": country["name"]["common"],
                    "value": country["name"]["common"] # Using common name for value
                })

        # Sort alphabetically by text (common name)
        simplified_countries.sort(key=lambda x: x["text"])

        with open("countries.json", "w", encoding="utf-8") as f:
            json.dump(simplified_countries, f, indent=2, ensure_ascii=False)

        print("Successfully generated countries.json")
        print(f"Found {len(simplified_countries)} countries.")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching country data: {e}")
    except json.JSONDecodeError:
        print("Error decoding JSON data.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    generate_countries_json()
