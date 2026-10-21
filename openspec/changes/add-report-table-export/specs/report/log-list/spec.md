# Spec Delta

## ADDED Requirements

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
