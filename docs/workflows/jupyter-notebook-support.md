# Jupyter Notebook Support in Qepton

## Overview

Qepton supports viewing and editing Jupyter notebooks (`.ipynb` files) stored as GitHub Gists. The implementation follows a "read-heavy, edit-light" philosophy appropriate for a snippet manager.

## Scope

### What Qepton Does

| Feature | Supported |
|---------|-----------|
| View/render cells | ✅ |
| Syntax highlighting for code cells | ✅ |
| Markdown rendering | ✅ |
| View existing outputs | ✅ |
| Rich outputs (images, HTML) | ✅ |
| Edit cell source (via JSON) | ✅ |

### What Qepton Does Not Do

| Feature | Supported | Rationale |
|---------|-----------|-----------|
| Execute cells | ❌ | Requires a kernel - out of scope |
| Add/delete/reorder cells | ❌ | Structural editing adds complexity |
| Live kernel connection | ❌ | Qepton is a viewer, not an IDE |

Users who need execution or structural editing should open notebooks in Jupyter, VS Code, or JupyterLab.

## Implementation

### Architecture

- **View mode**: Rendered notebook with markdown, code cells, and outputs
- **Edit mode**: Raw JSON in CodeMirror editor

This separation keeps the implementation simple while providing full editing capability for power users comfortable with JSON.

### Notebook Structure

Jupyter notebooks are JSON files with this structure:

```json
{
  "cells": [...],
  "metadata": {...},
  "nbformat": 4,
  "nbformat_minor": 4
}
```

### Cell Types

| Type | Purpose | Key Fields |
|------|---------|------------|
| `markdown` | Documentation | `source` |
| `code` | Executable code | `source`, `outputs`, `execution_count` |
| `raw` | Unformatted text | `source` |

### Output Types

Code cells can contain multiple output types:

| `output_type` | Description |
|---------------|-------------|
| `stream` | stdout/stderr (check `name` field) |
| `execute_result` | Return value (`Out[n]` display) |
| `display_data` | Rich output (images, HTML, etc.) |
| `error` | Exception traceback with ANSI codes |

### Implementation Notes

- `source` field may be a string or array of strings - join with empty string
- ANSI escape codes in error tracebacks need stripping or conversion to HTML
- Rich outputs can have multiple MIME types - pick the best available (`text/html` > `image/png` > `text/plain`)

## Future: Additional Notebook Formats

### Free Tier (Enhancement Issues)

| Format | Extension | Description | URL |
|--------|-----------|-------------|-----|
| R Markdown | `.Rmd` | YAML header + markdown + code chunks | https://rmarkdown.rstudio.com |
| Quarto | `.qmd` | Like R Markdown, multi-language | https://quarto.org |
| Marimo | `.py` | Python file with cell markers | https://marimo.io |
| Pluto.jl | `.jl` | Julia file with cell UUIDs | https://plutojl.org |

### Premium Tier

| Format | Extension | Description | URL |
|--------|-----------|-------------|-----|
| Apache Zeppelin | `.zpln` | Enterprise big data notebooks (Spark, Hadoop) | https://zeppelin.apache.org |

Zeppelin fits the premium tier because users of this format are typically in enterprise environments with data infrastructure budgets.

## Testing

A sample notebook covering key rendering cases is available for testing:

- Markdown cells with various formatting
- Code cells with different output types
- Stderr output
- Error tracebacks with ANSI codes
- Empty/unexecuted cells
- Metadata and kernel info
