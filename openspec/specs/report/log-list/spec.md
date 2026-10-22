# report/log-list Specification

## Purpose

Presents the integration logs a report viewer is allowed to see as a filterable list, and lets the viewer open one of them in the detail column.

## Requirements

### Requirement: Log list as a table
The report SHALL present the filtered logs as a table with one row per log, showing the integration (description with `origem → destino` beneath it), the execution date/time and the status. The table SHALL load more rows on demand instead of all at once, and its column headers and header toolbar SHALL stay visible while the rows scroll.

#### Scenario: Row content
- **WHEN** a log of integration "Contratações" (`SF → SAP`) executed on 26/09/2026 14:03:12 with status `ERROR` is listed
- **THEN** its row shows "Contratações", "SF → SAP", the date/time formatted as dd/MM/yyyy HH:mm:ss and the status "Erro"

#### Scenario: Load more
- **WHEN** the filters match more logs than the page size
- **THEN** only the first page is shown and the remaining logs are loaded when the viewer requests more

### Requirement: Row counter
The table SHALL show, next to its title, the total number of logs matching the current filters, updated whenever the filters change.

#### Scenario: Counter after filtering
- **WHEN** the applied filters match 42 logs
- **THEN** the table title shows the count 42

#### Scenario: Counter with no matches
- **WHEN** the applied filters match no logs
- **THEN** the table title shows the count 0

### Requirement: Translated status with semantic meaning
Every status in the report SHALL be displayed with its pt-BR text — `SUCCESS` as "Sucesso", `ERROR` as "Erro", `WARNING` as "Aviso", `RUNNING` as "Em execução" — together with a semantic state and icon: success for `SUCCESS`, error for `ERROR`, warning for `WARNING` and information for `RUNNING`.

#### Scenario: Error status
- **WHEN** a log has status `ERROR`
- **THEN** the row shows "Erro" with the negative/error color and the error icon

#### Scenario: Running status
- **WHEN** a log has status `RUNNING`
- **THEN** the row shows "Em execução" with the informative color, not the success color

### Requirement: Empty states
When the table has no rows, the report SHALL show an illustrated empty state that distinguishes the two cases: no log matches the applied filters, or the viewer has no logs at all.

#### Scenario: No match for the filters
- **WHEN** filters are applied and no log matches them
- **THEN** an illustrated "no results" message invites the viewer to adjust the filters

#### Scenario: Nothing to show
- **WHEN** no filter is applied and the viewer has access to no log
- **THEN** an illustrated "no entries" message is shown instead of the "no results" one

### Requirement: Open a log in the detail column
Pressing a row SHALL open that log in the detail column of the two-column layout and put the log id in the URL, so the list stays visible beside it and the address can be shared.

#### Scenario: Open a log
- **WHEN** the viewer presses the row of the log `A1B2`
- **THEN** the layout switches to two columns and the URL hash becomes `log/A1B2`

#### Scenario: Direct link
- **WHEN** the app is opened directly on the hash `log/A1B2`
- **THEN** that log is shown in the detail column beside the list

### Requirement: Export the log list
The log table SHALL offer an "Exportar" action that produces a spreadsheet file of the logs matching the current filters, with the columns Integração, Origem, Destino, Data/Hora and Status. The file SHALL contain every matching log, including the ones not yet loaded into the table, and SHALL respect the sort order in force. Values SHALL be written as the report displays them: the status in its pt-BR text and the execution date/time as `dd/MM/yyyy HH:mm:ss`. While the rows are collected and the file is built the action SHALL show that it is working, and when the table has no row the action SHALL be unavailable. The export SHALL expose no log the viewer is not already allowed to read.

#### Scenario: Export the filtered logs
- **WHEN** the applied filters match 42 logs and the viewer presses "Exportar"
- **THEN** a spreadsheet file with 42 rows and the five columns is downloaded

#### Scenario: Rows beyond the loaded page
- **WHEN** the filters match more logs than one page and only the first page is on screen
- **THEN** the file still contains every matching log

#### Scenario: Values as displayed
- **WHEN** a log with status `ERROR` executed on 26/09/2026 14:03:12 is exported
- **THEN** its row reads "Erro" and "26/09/2026 14:03:12", not `ERROR` and an ISO timestamp

#### Scenario: Nothing to export
- **WHEN** the applied filters match no log
- **THEN** the "Exportar" action is unavailable and no file is produced

#### Scenario: Export respects access
- **WHEN** a viewer who may see the logs of only one integration exports the list with no filter
- **THEN** the file contains only that integration's logs
