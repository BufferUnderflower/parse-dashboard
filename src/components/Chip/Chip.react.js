/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import React      from 'react';
import styles     from 'components/Chip/Chip.scss';
import PropTypes  from 'prop-types'

let Chip = ({ value, onClose }) => (
  <div className={[styles.chip].join(" ")}>
    <div className={[styles.content].join(" ")}>{value}</div>
    <div onClick={e=>{
        try{
          e.stopPropagation();
          e.nativeEvent.stopPropagation();
        } catch(e){
          console.error(e);
        }

        onClose(value);
      }
    }>
      <svg
        className={[styles.svg].join(" ")}
        focusable={false}
        viewBox="0 0 24 24"
        aria-hidden={true}
      >
        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path>
      </svg>
    </div>
  </div>
);

export default Chip;


Chip.propTypes = {
  onClose: PropTypes.func.isRequired.describe(
    'A function called when the close button clicked. It receives the value of as the only parameter.'
  ),
  value: PropTypes.string.isRequired.describe(
    'The string to be rendered inside chip.'
  )
}
