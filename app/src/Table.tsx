//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
import * as React from 'react';
import debug from 'debug';
import './Table.css';
import { connect } from '@oada/client';
import { tree } from './trellisTree';
import { observer } from 'mobx-react-lite';
import { computed } from 'mobx';
import { context } from './state';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import { visuallyHidden } from '@mui/utils';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import jp from 'jsonpath';
// @ts-ignore
import { file as convertFile, units, Slim } from '@modusjs/convert/dist-browser/bundle.mjs';

type Output = 'modusjson2' | 'json' | 'csv' | 'trellis';

const trace = debug('@modusjs/table:trace');
const info = debug('@modusjs/table:info');
const error = debug('@modusjs/table:error');
const warn = debug('@modusjs/table:warn');

export type Data = {
  id: string,
  type: string,
  filename: string,
  lab: string,
  date: string, //Date,
  sampleCount: number,
  field: string,
  farm: string,
}

export const paths = {
  'Sample Type': '$.type',
  Date: '$.date',
  Grower: '$.source.grower.name',
  Farm: '$.source.farm.name',
  Field: '$.source.field.name',
  'Source Filename(s)': '$.lab.files[*].name',
  Lab: '$.lab.name',
}


function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (
  a: { [key in Key]: number | string },
  b: { [key in Key]: number | string },
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

interface HeadCell {
  disablePadding: boolean;
  id: keyof Data;
  label: string;
  numeric: boolean;
}

const headCells: readonly HeadCell[] = [
  {
    id: 'filename',
    numeric: false,
    disablePadding: true,
    label: 'Source Filename(s)',
  },
  {
    id: 'type',
    numeric: false,
    disablePadding: false,
    label: 'Sample Type',
  },
  {
    id: 'date',
    numeric: false,
    disablePadding: false,
    label: 'Date',
  },
  {
    id: 'lab',
    numeric: false,
    disablePadding: false,
    label: 'Lab',
  },
  {
    id: 'sampleCount',
    numeric: true,
    disablePadding: false,
    label: '# of Samples',
  },
  {
    id: 'farm',
    numeric: false,
    disablePadding: false,
    label: 'Farm Name',
  },
  {
    id: 'field',
    numeric: false,
    disablePadding: false,
    label: 'Field Name',
  },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof Data) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } =
    props;
  const createSortHandler =
    (property: keyof Data) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{
              'aria-label': 'select all desserts',
            }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={'right'/*headCell.numeric ? 'right' : 'left'*/}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

interface EnhancedTableToolbarProps {
  numSelected: number;
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const { actions } = React.useContext(context);
  const { numSelected } = props;

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme: any) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
      ) : (
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          MODUS Lab Results
        </Typography>
      )}
      {numSelected > 0 ? (
        <div className="toolbarButtonGroup">
          <Tooltip title="Download">
            <IconButton
              onClick={handleClick}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              onClick={actions.deleteSelected}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            id="download-selection-menu"
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => {
              actions.downloadAsCsv();
              handleClose();
            }}>
              Download as CSV
            </MenuItem>
            <MenuItem onClick={() => {
              actions.downloadAsSlim();
              handleClose();
            }}>
              Download as MODUS JSON
            </MenuItem>
          </Menu>
        </div>
      ) : (
        <Tooltip title="Filter list">
          <IconButton>
            <FilterListIcon />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  );
}

export default observer(function App() {
  const { state, actions } = React.useContext(context);
  //@ts-ignore
  const rows : Data[] = Object.entries(state.files).map(([key, slim]: [string, Slim]) => ({
    id: key,
    sampleCount: Object.keys(slim.samples).length,
    ...Object.fromEntries(headCells
        //@ts-ignore
      .filter(hc => paths[hc.label])
      .map(hc => ([
        hc.id,
        //@ts-ignore
        jp.query(slim, paths[hc.label])[0] || ''
      ]))
    )
  }));
  const {order, orderBy, selected, page, dense, rowsPerPage } = state.table;
  const setTable = actions.setTable;

    const handleRequestSort = (
      event: React.MouseEvent<unknown>,
      property: keyof Data,
    ) => {
      const isAsc = orderBy === property && order === 'asc';
      setTable('order', isAsc ? 'desc' : 'asc');
      setTable('orderBy', property);
    };

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const newSelected = rows.map((n: any) => n.id);
        setTable('selected', newSelected);
        return;
      }
      setTable('selected', []);
    };

    const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
      const selectedIndex = selected.indexOf(id);
      let newSelected: readonly number[] = [];

      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, id);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
      } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(
          selected.slice(0, selectedIndex),
          selected.slice(selectedIndex + 1),
        );
      }
      setTable('selected', newSelected);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
      setTable('page', newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
      setTable('rowsPerPage', parseInt(event.target.value, 10));
      setTable('page', 0);
    };

    const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
      setTable('dense', event.target.checked);
    };

    const isSelected = (id: number) => selected.indexOf(id) !== -1;

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows =
      page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

    const visibleRows = //React.useMemo(
      //() =>
      //@ts-ignore
        stableSort(rows, getComparator(order, orderBy)).slice(
          page * rowsPerPage,
          page * rowsPerPage + rowsPerPage,
        )
      //[order, orderBy, page, rowsPerPage],
    //);

  return (
    <div className="tab">
      {state.output === 'trellis' ?
         <Box sx={{ width: '100%' }}>
         <Paper sx={{ width: '100%', mb: 2 }}>
           <EnhancedTableToolbar numSelected={selected.length} />
           <TableContainer>
             <Table
               sx={{ minWidth: 750 }}
               aria-labelledby="tableTitle"
               size={dense ? 'small' : 'medium'}
             >
               <EnhancedTableHead
                 numSelected={selected.length}
                 order={order}
                 orderBy={orderBy}
                 onSelectAllClick={handleSelectAllClick}
                 onRequestSort={handleRequestSort}
                 rowCount={rows.length}
               />
               <TableBody>
                 {visibleRows.map((row:any, index:number) => {
                   const isItemSelected = isSelected(row.id);
                   const labelId = `enhanced-table-checkbox-${index}`;
                   return (
                     <TableRow
                       hover
                       onClick={(event: any) => handleClick(event, row.id)}
                       role="checkbox"
                       aria-checked={isItemSelected}
                       tabIndex={-1}
                       key={row.id}
                       selected={isItemSelected}
                       sx={{ cursor: 'pointer' }}
                     >
                       <TableCell padding="checkbox">
                         <Checkbox
                           color="primary"
                           checked={isItemSelected}
                           inputProps={{
                             'aria-labelledby': labelId,
                           }}
                         />
                       </TableCell>
                       <TableCell
                         component="th"
                         id={labelId}
                         scope="row"
                         padding="none"
                       >
                         {row.filename}
                       </TableCell>
                       <TableCell align="right">{row.type}</TableCell>
                       <TableCell align="right">{row.date}</TableCell>
                       <TableCell align="right">{row.lab}</TableCell>
                       <TableCell align="right">{row.sampleCount}</TableCell>
                       <TableCell align="right">{row.farm}</TableCell>
                       <TableCell align="right">{row.field}</TableCell>
                     </TableRow>
                   );
                 })}
                 {emptyRows > 0 && (
                   <TableRow
                     style={{
                       height: (dense ? 33 : 53) * emptyRows,
                     }}
                   >
                     <TableCell colSpan={6} />
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </TableContainer>
           <TablePagination
             rowsPerPageOptions={[5, 10, 25]}
             component="div"
             count={rows.length}
             rowsPerPage={rowsPerPage}
             page={page}
             onPageChange={handleChangePage}
             onRowsPerPageChange={handleChangeRowsPerPage}
           />
         </Paper>
         <FormControlLabel
           control={<Switch checked={dense} onChange={handleChangeDense} />}
           label="Dense padding"
         />
      </Box>
      : null }
    </div>
  );
});
