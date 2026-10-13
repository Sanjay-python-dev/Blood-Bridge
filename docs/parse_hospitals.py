import pypdf
import re
import json

def parse_pdf1():
    reader = pypdf.PdfReader('c:/blood bridge/hospital_data/Blood_Bridge_Hospital_Login_Credentials.pdf')
    hospitals = []
    
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        current_district = None
        for line in lines:
            m = re.match(r'^\d+\.\s+(.+?)\s+District', line)
            if m:
                current_district = m.group(1).strip()
                break
                
        i = 0
        while i < len(lines):
            line = lines[i]
            # Match entry number
            if re.match(r'^\d+$', line) and i + 4 < len(lines):
                num = int(line)
                hosp_name = lines[i+1]
                loc = lines[i+2]
                key = lines[i+3]
                pwd = lines[i+4]
                
                # Check if key matches format
                if re.match(r'^TN\d+-[A-Z]+-\d+$', key):
                    hospitals.append({
                        'district': current_district,
                        'no': num,
                        'name': hosp_name,
                        'location': loc,
                        'user_key': key,
                        'password': pwd
                    })
                    i += 5
                    continue
            i += 1
            
    districts = sorted(list(set(h['district'] for h in hospitals if h['district'])))
    print(f"PDF 1 parsed: {len(hospitals)} hospitals across {len(districts)} districts.")
    return hospitals

def parse_pdf2():
    reader = pypdf.PdfReader('c:/blood bridge/hospital_data/Blood_Bridge_Hospital_Login_Credentials_Part_4.pdf')
    hospitals = []
    
    # In Part 4, rows are: District, No., Hospital Name, Location, Unique Key, Password
    for page_num, page in enumerate(reader.pages):
        text = page.extract_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        i = 0
        while i < len(lines):
            # Look for Unique Key in lines[i+4]
            if i + 5 < len(lines):
                dist = lines[i]
                no_str = lines[i+1]
                hosp_name = lines[i+2]
                loc = lines[i+3]
                key = lines[i+4]
                pwd = lines[i+5]
                
                if re.match(r'^\d+$', no_str) and re.match(r'^BB-[A-Z]+-\d+-[A-F0-9]+$', key):
                    hospitals.append({
                        'district': dist,
                        'no': int(no_str),
                        'name': hosp_name,
                        'location': loc,
                        'user_key': key,
                        'password': pwd
                    })
                    i += 6
                    continue
            i += 1
            
    districts = sorted(list(set(h['district'] for h in hospitals if h['district'])))
    print(f"PDF 2 parsed: {len(hospitals)} hospitals across {len(districts)} districts.")
    return hospitals

h1 = parse_pdf1()
h2 = parse_pdf2()
all_hospitals = h1 + h2
print(f"Total hospitals parsed: {len(all_hospitals)}")
print(f"Sample from PDF 1:", all_hospitals[0])
print(f"Sample from PDF 2:", h2[0] if h2 else "None")
