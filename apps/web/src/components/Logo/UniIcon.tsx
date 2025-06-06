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


    <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
      width="150.000000pt" height="150.000000pt" viewBox="0 0 150.000000 150.000000"

      style={{
        borderRadius: '8px',
        width: '32px',
        height: '32px'
      }}
      preserveAspectRatio="xMidYMid meet">

      <g transform="translate(0.000000,150.000000) scale(0.100000,-0.100000)"
        fill="#6247cb" stroke="none">
        <path d="M648 1273 c-60 -2 -100 -8 -105 -16 -18 -24 -115 -249 -109 -254 8
-9 377 249 373 261 -4 13 -24 14 -159 9z"/>
        <path d="M893 1248 c41 -102 63 -139 91 -156 29 -17 37 -17 106 -5 41 8 82 16
90 19 9 4 -42 35 -130 79 -152 78 -165 83 -157 63z"/>
        <path d="M665 1124 c-99 -69 -187 -132 -195 -141 -13 -14 -13 -15 5 -10 11 3
112 22 225 43 134 24 211 42 222 53 16 15 15 21 -20 99 -20 45 -41 82 -47 82
-5 -1 -91 -57 -190 -126z"/>
        <path d="M342 1157 l-104 -62 -54 -95 c-45 -79 -52 -96 -41 -108 22 -21 163
35 216 86 45 43 127 202 117 227 -9 23 -23 18 -134 -48z"/>
        <path d="M1104 1066 c-82 -17 -94 -22 -94 -43 0 -9 39 -83 88 -165 66 -113 92
-148 107 -148 25 0 135 143 134 174 0 12 -26 59 -57 106 -64 96 -69 98 -178
76z"/>
        <path d="M642 980 c-111 -20 -206 -40 -209 -44 -8 -7 160 -181 191 -198 16 -9
34 6 135 112 63 68 124 134 134 147 l18 23 -33 -1 c-18 -1 -124 -18 -236 -39z"/>
        <path d="M795 854 l-138 -147 105 -103 c58 -57 109 -104 115 -104 9 0 68 488
60 496 -2 3 -66 -62 -142 -142z"/>
        <path d="M976 969 c-3 -13 -17 -112 -31 -219 -14 -107 -28 -208 -31 -224 -6
-26 -4 -28 16 -23 12 3 69 36 125 74 73 48 105 75 108 92 3 16 -20 64 -79 164
-97 164 -101 168 -108 136z"/>
        <path d="M215 871 c-60 -21 -110 -42 -110 -48 0 -24 61 -183 70 -183 10 0 165
247 165 263 0 10 -4 9 -125 -32z"/>
        <path d="M286 759 c-48 -78 -84 -145 -79 -150 4 -4 51 -14 103 -21 93 -13 95
-14 100 -42 3 -16 10 -31 16 -33 14 -5 184 174 184 192 0 22 -192 195 -216
195 -16 0 -41 -32 -108 -141z"/>
        <path d="M1295 763 c-63 -86 -63 -112 3 -170 61 -54 75 -54 90 1 9 35 8 61 -4
132 -16 91 -20 104 -33 104 -4 0 -29 -30 -56 -67z"/>
        <path d="M536 578 c-53 -57 -96 -108 -96 -114 0 -6 23 -30 52 -54 l51 -44 89
3 c73 2 100 8 154 32 36 16 68 37 71 45 4 11 -28 50 -103 125 -60 60 -112 109
-116 109 -3 0 -49 -46 -102 -102z"/>
        <path d="M1040 538 c-69 -44 -128 -86 -132 -92 -4 -6 -8 -31 -8 -56 0 -41 6
-51 58 -109 63 -70 82 -73 82 -13 0 37 2 38 150 135 83 53 150 103 150 110 0
8 -23 33 -50 56 -81 68 -101 66 -250 -31z"/>
      </g>
    </svg>



    {/* <svg version="1.0" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32.000000 32.000000"
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
    </svg> */}
  </Container>
)

const Container = styled.div<{ clickable?: boolean }>`
  position: relative;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'auto')};
`
