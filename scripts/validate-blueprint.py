"""Validate Render YAML against its official public JSON schema, without credentials."""
import json
from pathlib import Path
import sys
from urllib.request import urlopen

local_tools = Path(__file__).resolve().parents[1] / '.local' / 'render-validation'
if local_tools.exists():
    sys.path.insert(0, str(local_tools))
import yaml
import jsonschema

root = Path(__file__).resolve().parents[1]
with urlopen('https://render.com/schema/render.yaml.json', timeout=30) as response:
    schema = json.load(response)
blueprint = yaml.safe_load((root / 'render.yaml').read_text())
jsonschema.validate(blueprint, schema)
print('render.yaml passes the official Render JSON schema.')
# App-specific wiring checks beyond JSON shape validation.
services = {service['name']: service for service in blueprint['services']}
assert set(services) == {'quickpay-web', 'quickpay-api', 'quickpay-worker'}
assert services['quickpay-worker']['type'] == 'worker'
assert services['quickpay-api']['disk']['mountPath'] == '/var/data'
assert all('deploy:start' in service['startCommand'] for service in services.values())
for service in services.values():
    for variable in service['envVars']:
        reference = variable.get('fromService')
        if reference:
            assert reference['name'] in services
            if 'envVarKey' in reference:
                assert reference['envVarKey'] in {v.get('key') for v in services[reference['name']]['envVars']}
print('Web/API/worker references and persistent evidence wiring pass.')
