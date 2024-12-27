import styled from 'styled-components'

// ESLint reports `fill` is missing, whereas it exists on an SVGProps type
export type SVGProps = React.SVGProps<SVGSVGElement> & {
  fill?: string
  height?: string | number
  width?: string | number
  gradientId?: string
  clickable?: boolean
}

export const UniIcon = ({ clickable, ...props }: SVGProps) => (
  <Container clickable={clickable}>
    <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32.000000 32.000000"
      preserveAspectRatio="xMidYMid meet"
      style={{
        backgroundColor: '#00aab9',
        borderRadius: '8px',
        width: '32px',
        height: '32px'
      }}
    >

      <g transform="translate(0.000000,32.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
        <path d="M0 249 l0 -71 26 6 c26 7 26 1 0 -32 -8 -11 -11 -10 -17 5 -4 10 -8
-21 -8 -69 l-1 -88 160 0 160 0 0 58 c0 47 -4 59 -21 70 -17 11 -18 16 -8 28
10 12 14 12 20 2 5 -7 9 25 9 75 l0 87 -160 0 -160 0 0 -71z m181 21 c32 -17
22 -38 -20 -45 -51 -8 -71 2 -60 33 9 24 46 30 80 12z m59 -15 l25 -14 -26 -1
c-15 0 -29 7 -33 15 -7 18 2 18 34 0z m-162 -17 c-15 -22 -58 -51 -66 -43 -7
7 22 44 43 54 32 16 38 13 23 -11z m212 -23 c10 -13 10 -21 1 -43 l-13 -27
-24 30 c-13 17 -24 36 -24 43 0 17 45 15 60 -3z m-127 -27 c-32 -31 -33 -32
-53 -13 -29 26 -15 35 70 44 9 0 1 -12 -17 -31z m37 -20 c0 -50 -11 -60 -39
-37 l-24 20 23 24 c31 33 40 31 40 -7z m60 -24 c0 -9 -40 -34 -55 -34 -5 0 3
54 11 80 4 12 10 9 24 -10 11 -14 20 -30 20 -36z m-155 26 c17 -19 17 -21 1
-39 -15 -16 -23 -18 -47 -9 -29 10 -29 10 -12 39 20 34 33 36 58 9z m54 -54
c12 -13 19 -26 14 -29 -50 -28 -101 -4 -68 33 23 25 27 25 54 -4z m130 0 c9
-11 5 -18 -24 -36 -19 -12 -35 -26 -35 -32 0 -6 -6 -6 -15 2 -23 19 -18 39 18
60 38 24 41 24 56 6z" />
        <path d="M135 250 c-16 -11 -25 -20 -20 -20 10 0 64 39 55 40 -3 0 -18 -9 -35
-20z" />
      </g>
    </svg>
  </Container>
)

const Container = styled.div<{ clickable?: boolean }>`
  position: relative;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'auto')};
`
