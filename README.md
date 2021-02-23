# Nexus grader config validation

Validates a Nexus grader config YAML file by checking it against grader config schema definition retrieved from a remote HTTP API endpoint.

The response of the HTTP API endpoints should be a JSON version of any `config_schema.yml` file defined in a grader.

## Inputs

### `grader-config-schema-endpoints`

**Required** A stringified JSON object where keys are grader names and values are the GET HTTP API config_schema endpoints.

### `yaml-file`

**Required** The name of the assignment grader config YAML file to validate.

## Example usage

```yaml
- name: Nexus grader config validation
  uses: mpoc/nexus-grader-config-test-action@master
  with:
    api-endpoint: >
        {
            "javac-tool": "http://192.168.99.1:3003/config_schema",
            "rng-tool": "http://192.168.99.1:3001/config_schema",
            "config-tool": "http://192.168.99.1:3002/config_schema",
            "io-grader": "http://192.168.99.1:3004/config_schema",
            "junit-grader": "http://192.168.99.1:3006/config_schema",
            "cpp-iograder": "http://192.168.99.1:3008/config_schema",
            "cpp-compilation": "http://192.168.99.1:3007/config_schema",
            "cppunit-grader": "http://192.168.99.1:3015/config_schema"
        }
    yaml-file: grader-config.yml
```
