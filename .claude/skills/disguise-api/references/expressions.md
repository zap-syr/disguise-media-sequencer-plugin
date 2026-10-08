# Expressions

Source: https://developer.disguise.one/python-api/guides/expressions/
(Full syntax reference: "Expressions Overview" in the Disguise User Guide.)

Expressions are evaluated **every frame** and can drive numeric and text layer properties.
From Python they are applied to a layer's `FieldSequence`:

```python
fseq = layer.findSequence("brightness")
fseq.setExpression("self * 0.5")        # FieldSequence.setExpression(expr: str)
fseq.setExpression("self")              # reset to default (= keyframed value)
```

> ⚠ The official guide builds expressions with **f-strings** - these are a SyntaxError in
> Designer's Python 2.7. Use `.format()`:
> `seq.setExpression("module:{}.brightness".format(emitter_layer.name))`

## Syntax basics

### System variables

| Variable | Meaning |
|---|---|
| `self` | The property's keyframed value (the default expression) |
| `self.min` / `self.max` | Allowed range of the property |
| `time` | Track time in seconds since the track started |
| `uptime` | Synchronised time across all servers (global system variable) |
| `pi`, `e` | Global constants |

### Common functions

| Function | Example |
|---|---|
| `math.sin(x)` / `math.cos(x)` (radians) | `0.5 + 0.5 * math.sin(time * math.pi)` |
| `min(a, b)` / `max(a, b)` | `min(1, osc:fader1)`, `max(0, self - 0.1)` |
| `lerp(a, b, t)` | `lerp(0, 100, osc:fader1)` |
| `clamp(x, a, b)` | `clamp(osc:fader1, 0.1, 0.9)` |
| `if(cond, a, b)` | `if(osc:button1 > 0, 1, 0)`, `if(time > 10, self, 0)`, `if(module:video.frameNumberDisplay < 50, 0, 1)` |
| `format(pattern, ...)` | `format("Current time: %.2fs", time)` |
| `format::` prefix | `format::"%.2f":time` |

Format specifiers: `%(flags)(width)(.precision)type` - `d` int, `f` float, `s` string, `x` hex.

### Data types and operators

Number (`10`, `3.14`), String (`"hello"`), Boolean (`True`), Vector (`V2(1, 2)`),
Colour (`Colour(1, 0, 0, 1)`).
Operators: `+ - * /`, `== != < > <= >=`, `and or not`.

### Referencing resources

- **By name**: `type:name` - `projector:"projector 1"` or `projector:projector_1`
  (spaces/special chars → `_` when unquoted).
- **By UID** (rename-safe): `getByUID(0x123875234)` (UI: resource editor title bar → right click → Copy UID).
- **Fields** via `.`: `projector:projector_1.offset.x`. Common: `description`, `offset`, `rotation`, `scale`.
- Accessing a field of an empty/None resource makes the expression fail - guard with `if(...)`.

### Referencing other layers

`module:<layer_name>.<property>` - e.g. `module:video.frameNumberDisplay`.
Spaces in layer names must be written as `_` (`"video effects"` → `video_effects`).

### External protocols

| Protocol | Syntax | Example |
|---|---|---|
| OSC | `osc:/address` | `osc:/d3/helloworld` |
| DMX | `dmx:universe.address` (8-bit), `dmx16:universe.address` (16-bit) | `dmx:1.1`, `dmx16:3.20` |
| MIDI | `midi:note`, `midi:ccN` | `midi:60` (C4), `midi:cc1` (mod wheel) |
| Audio line | `audioline:name.c[range]` | `audioline:my-audio.c[0]` (e.g. bass level) |

### Range prefixes

| Prefix | Effect | Example |
|---|---|---|
| `limit::` | Clamp result to the property's min/max | `limit::osc:fader1` |
| `scale::` | Scale a 0–1 input to the property's full range | `scale::osc:fader1` |

### Variables

- **Inline assignment**: `myvar = sin(uptime / 20)` - visible only to layers *higher* in the
  composition stack, and only while the defining layer is active.
- **ExpressionVariable layers** - animated variables on the track.
- **ExpressionVariable devices** - global variables not tied to the track.
- **Function variables** with parameters, e.g. `maybe_override(value)` =
  `if(osc:show.override, value, self)`, then `maybe_override(osc:show.field1)` on a layer.

## Python recipes

```python
layer = guisystem.track.layers[0]

# Sine-wave opacity / "breathing" brightness
layer.findSequence("opacity").setExpression("0.5 + 0.5 * math.sin(time * math.pi)")
layer.findSequence("brightness").setExpression("0.5 + 0.5 * math.sin(time * 2)")

# Conditional
layer.findSequence("brightness").setExpression("if(time > 5, 1, 0)")

# External kill switch via OSC
layer.findSequence("brightness").setExpression("self * (1 - osc:video.emergency_cut_out)")

# Link one layer's property to another (Python 2.7 - no f-strings)
receiver = guisystem.track.layers[1]
receiver.findSequence("brightness").setExpression("module:{}.brightness".format(layer.name))

# Text layer
text_layer.findSequence("text").setExpression("format(\"Current time: %.2fs\", time)")

# RGB of a Colour layer from three OSC addresses
color_layer.findSequence("red").setExpression("osc:color.red")
color_layer.findSequence("green").setExpression("osc:color.green")
color_layer.findSequence("blue").setExpression("osc:color.blue")
```

Read back: `fseq.expression` returns an `Expression` object; its text is `fseq.expression.expression`.

## ExpressionVariablesDevice from Python

```python
def run():
    # Guide uses "devices/<name>"; the resource guide's convention would be
    # "objects/expressionvariablesdevice/<name>.apx" - pick one and stay consistent.
    var_device = resourceManager.loadOrCreate("objects/expressionvariablesdevice/my_variables.apx",
                                              ExpressionVariablesDevice)
    device_manager = state.devices
    if var_device not in device_manager.devices:
        device_manager.devices.append(var_device)          # make it active

    var_container = var_device.container
    var_container.variables.append(ExpressionVariable())  # add empty variable
    new_var = var_container.variables[-1]
    new_var.name = "my_variable_name"
    new_var.type = ExpressionVariable.FloatType            # also StringType, FunctionType
    new_var.defaultFloat = 5
    var_device.saveOnDelete()
    return {"status": "success"}
return run()
```

Use it in any expression by name: `seq.setExpression("my_variable_name * 2")`.
To update an existing variable's value see `references/devices.md`.

### Idea for this plugin
Pushing a value into an ExpressionVariable (cheap, one execute call) and referencing it from
layer expressions is a good way to drive many layers live without rewriting keyframes.
