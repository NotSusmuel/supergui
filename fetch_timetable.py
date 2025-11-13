"""
Script to fetch ICS from KSR API and convert to CSV format
This matches the user's provided script
"""
import csv
import requests
from datetime import datetime

def fetch_and_convert_to_csv(url, output_file="stundenplan.csv"):
    """
    Fetch ICS from URL and convert to CSV format
    Format: Subject,Start Date,Start Time,End Date,End Time,Description,Location
    """
    input_file = "stundenplan_temp.ics"
    
    # Download ICS from URL
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        with open(input_file, "wb") as f:
            f.write(r.content)
    except Exception as e:
        print(f"Error fetching ICS: {e}")
        return False
    
    # Parse ICS file
    events = []
    with open(input_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    
    event = {}
    for line in lines:
        line = line.strip()
        if line.startswith("BEGIN:VEVENT"):
            event = {}
        elif line.startswith("SUMMARY:"):
            event["Subject"] = line.replace("SUMMARY:", "")
        elif line.startswith("DTSTART:"):
            dtstart = datetime.strptime(line.replace("DTSTART:", ""), "%Y%m%dT%H%M%SZ")
            event["Start Date"] = dtstart.strftime("%m/%d/%Y")
            event["Start Time"] = dtstart.strftime("%H:%M")
        elif line.startswith("DTEND:"):
            dtend = datetime.strptime(line.replace("DTEND:", ""), "%Y%m%dT%H%M%SZ")
            event["End Date"] = dtend.strftime("%m/%d/%Y")
            event["End Time"] = dtend.strftime("%H:%M")
        elif line.startswith("END:VEVENT"):
            events.append(event)
    
    # Write to CSV
    with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = ["Subject", "Start Date", "Start Time", "End Date", "End Time", "Description", "Location"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for e in events:
            writer.writerow({
                "Subject": e.get("Subject", ""),
                "Start Date": e.get("Start Date", ""),
                "Start Time": e.get("Start Time", ""),
                "End Date": e.get("End Date", ""),
                "End Time": e.get("End Time", ""),
                "Description": "",
                "Location": ""
            })
    
    print(f"CSV file created: {output_file}")
    return True

if __name__ == "__main__":
    url = "https://isy-api.ksr.ch/pagdDownloadTimeTableIcal/dmbphs0g5i58gpwo7fxkja/timetable.ics"
    fetch_and_convert_to_csv(url)
