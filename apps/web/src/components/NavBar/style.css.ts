import { style } from '@vanilla-extract/css'

import { subhead } from '../../nft/css/common.css'
import { sprinkles, vars, breakpoints } from '../../nft/css/sprinkles.css'

export const logoContainer = style([
  sprinkles({
    display: 'flex',
    marginRight: '24',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '8',
  }),
  {
    transition: 'transform 0.3s ease 0s',
    ':hover': {
      transform: 'rotate(-5deg)',
    },
    '@media': {
      [`screen and (max-width: ${breakpoints.md - 1}px)`]: {
        marginRight: '0px',
        gap: "unset"
      },
      [`screen and (min-width: ${breakpoints.md}px)`]: {
        marginRight: '12px',
        gap: "4px"
      },
      [`screen and (min-width: ${breakpoints.lg}px)`]: {
        marginRight: '24px',
        gap: "8px"
      }
    }
  },
])

export const logo = style([
  sprinkles({
    display: 'block',
    color: 'accent1',
  }),
])

export const baseSideContainer = style([
  sprinkles({
    display: 'flex',
    width: 'full',
    flex: '1',
    flexShrink: '2',
  }),
])

export const leftSideContainer = style([
  baseSideContainer,
  sprinkles({
    alignItems: 'center',
    justifyContent: 'flex-start',
  }),
])

export const searchContainer = style([
  sprinkles({
    flex: '1',
    flexShrink: '1',
    justifyContent: { lg: 'flex-end', xl: 'center' },
    display: { sm: 'none' },
    alignSelf: 'center',

    alignItems: 'flex-start',
  }),
  { height: '42px' },
])

export const rightSideContainer = style([
  baseSideContainer,
  sprinkles({
    alignItems: 'center',
    justifyContent: 'flex-end',
  }),
])

const baseMenuItem = style([
  subhead,
  sprinkles({
    paddingY: '8',
    paddingX: { sm: '6', md: '14' },
    marginY: '4',
    borderRadius: '14',
    marginX: { sm: '4', md: '0' },
    transition: '250',
    height: 'min',
    width: 'full',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4',
  }),
  {
    lineHeight: '22px',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    ':hover': {
      background: vars.color.lightGrayOverlay,
    },
  },
])

export const menuItem = style([
  baseMenuItem,
  sprinkles({
    color: 'neutral2',
  }),
])

export const activeMenuItem = style([
  baseMenuItem,
  sprinkles({
    color: 'neutral1',
    background: 'none',
  }),
])
