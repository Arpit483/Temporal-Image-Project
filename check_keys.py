import httpx, xml.etree.ElementTree as ET

checks = [
    ('noaa-goes16', 'ABI-L2-CMIPF/2024/183/01/', 'Beryl hr01'),
    ('noaa-goes18', 'ABI-L2-CMIPF/2023/297/09/', 'Otis hr09'),
    ('noaa-goes16', 'ABI-L2-CMIPF/2024/197/20/', 'Derecho hr20'),
    ('noaa-goes18', 'ABI-L2-CMIPF/2024/035/13/', 'AtmRiver hr13'),
]

for bucket, prefix, label in checks:
    url = f'https://{bucket}.s3.amazonaws.com/?prefix={prefix}'
    resp = httpx.get(url, timeout=15.0)
    root = ET.fromstring(resp.content)
    ns = {'s3': 'http://s3.amazonaws.com/doc/2006-03-01/'}
    keys = [elem.text for elem in root.findall('.//s3:Key', ns) if 'M6C13' in elem.text]
    if keys:
        name = keys[0].split('/')[-1]
        print(label + ': FOUND -> ' + name)
    else:
        print(label + ': NOT FOUND in ' + prefix)
