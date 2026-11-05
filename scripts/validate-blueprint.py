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
assert set(services) == {'quickpay-web', 'quickpay-api'}
assert not blueprint.get('databases'), 'Use the existing external Neon database.'
api_env = {v['key']: v for v in services['quickpay-api']['envVars']}
assert api_env['RUN_WORKER_IN_API']['value'] == 'true'
assert api_env['UPLOAD_STORAGE']['value'] == 'database'
assert all(api_env[key].get('sync') is False for key in ('DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'API_ORIGIN'))
api = services['quickpay-api']
web = services['quickpay-web']
assert api['runtime'] == 'node' and api['plan'] == 'free'
assert api['startCommand'] == 'node --import tsx scripts/start-deployment.ts api'
assert web['runtime'] == 'static'
assert web['staticPublishPath'] == 'apps/web/out'
assert not any(key in web for key in ('startCommand', 'healthCheckPath', 'plan'))
web_env = {v['key']: v for v in web['envVars']}
assert web_env['WEB_ORIGIN']['fromService'] == {
    'name': 'quickpay-api', 'type': 'web', 'envVarKey': 'WEB_ORIGIN',
}
assert any(
    route['type'] == 'rewrite'
    and route['source'] == '/api/v1/*'
    and route['destination'].startswith('https://')
    and route['destination'].endswith('/api/v1/*')
    for route in web['routes']
), 'Static website must proxy API requests over HTTPS.'
assert 'API_HOSTPORT' not in web_env, 'Free services cannot receive private traffic.'
for service in services.values():
    assert service['type'] == 'web'
    assert not any(key in service for key in ('disk', 'preDeployCommand', 'maxShutdownDelaySeconds', 'scaling'))
    for variable in service['envVars']:
        reference = variable.get('fromService')
        if reference:
            assert reference['name'] in services
            if 'envVarKey' in reference:
                assert reference['envVarKey'] in {v.get('key') for v in services[reference['name']]['envVars']}
print('Blueprint application wiring checks pass.')
