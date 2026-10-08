# Devices

Source: https://developer.disguise.one/python-api/guides/devices/

## Device Manager

`state.devices` is the project's Device Manager singleton. Only devices in
`device_manager.devices` are **active**.

| Task | Code |
|---|---|
| Get manager | `device_manager = state.devices` |
| All devices of a type | `[d for d in device_manager.devices if isinstance(d, DmxDevice)]` |
| Add (activate) | `device_manager.devices.append(device)` |
| Remove from manager | `device_manager.devices.remove(device)` |
| Find by display name | `next((d for d in device_manager.devices if d.description == "MyDevice"), None)` |
| List names | `[d.description for d in device_manager.devices]` |
| Iterate | `for device in device_manager.devices: ...` |
| Delete device **and its file** | `device_manager.deleteDevice(device)` |

## Device properties

| Task | Code |
|---|---|
| Type name (user-facing) | `type(device).__username__` |
| User-facing name | `device.name` |
| Path (`Path` object) | `device.path` |
| Enabled? / toggle | `device.enabled` / `device.enabled = True` |
| DMX driver type, e.g. ArtNet (`DmxDevice` only) | `device.driverType()` |
| Save to disk | `device.save()` |
| Reload from disk (discard unsaved changes) | `device.reload()` |

## OSC device

| Task | Code |
|---|---|
| Receive port | `osc_device.receivePort = 8000` |
| Send port | `osc_device.sendPort = 8001` |
| Destination IP | `osc_device.sendIPAddress = "127.0.0.1"` |
| Status string | `osc_device.status` |
| Started? / start | `osc_device.started` / `osc_device.start()` |

### Create + configure + activate an OSC device (official snippet)

```python
osc = resourceManager.loadOrCreate('objects/oscdevice/pluginmonitor.apx', OscDevice)

osc.sendIPAddress = '127.0.0.1'   # where the plugin listens
osc.sendPort = port               # plugin's listening port
osc.receivePort = port + 1        # Designer listens on the next port

device_exists = False
for device in state.devices.devices:
    if device.path == osc.path:
        device_exists = True
        break
if not device_exists:
    state.devices.devices.append(osc)

if not osc.started:
    osc.start()
```

(The official snippet uses `objects/OscDevice/PluginMonitor.apx`; the resource guide requires
lowercase paths - use lowercase for new code.)

## Expression variables device

Set a variable's default value on an `ExpressionVariablesDevice` (useful to push values from
the plugin into expressions):

```python
for device in resourceManager.allResources(ExpressionVariablesDevice):
    if device.path == 'objects/expressionvariablesdevice/pluginvariable.apx':
        for var in device.container.variables:
            if var.name == 'plugin_value':
                var.defaultFloat = value
                break
```

Compare paths with `str(device.path)` if a direct `==` comparison to a string misbehaves.
