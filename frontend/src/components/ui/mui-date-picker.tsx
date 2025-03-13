"use client"

import * as React from "react"
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { Theme } from '@mui/material/styles'

interface MuiDatePickerProps {
  date?: Date
  setDate: (date: Date | null) => void
  label?: string
  disabled?: boolean
}

declare module '@mui/material/styles' {
  interface Components {
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: string;
            color: string;
          };
        };
      };
    };
  }
}

export const theme = createTheme({
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976d2',
            },
          },
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#1976d2',
            color: '#fff',
          },
        },
      },
    },
  },
})

export function MuiDatePicker({ date, setDate, label = "Select date and time", disabled }: MuiDatePickerProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DateTimePicker
          label={label}
          value={date || null}
          onChange={(newDate) => setDate(newDate)}
          disabled={disabled}
          slotProps={{
            textField: {
              variant: "outlined",
              fullWidth: true,
              sx: {
                '& .MuiInputBase-root': {
                  borderRadius: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
                '& .MuiInputLabel-root': {
                  color: '#a1a1aa',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#27272a',
                },
              }
            },
          }}
        />
      </LocalizationProvider>
    </ThemeProvider>
  )
} 