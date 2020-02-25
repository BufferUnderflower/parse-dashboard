/*
 * Copyright (c) 2016-present, Parse, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */
import Position             from "lib/Position";
import React, { Component } from "react";
import ReactDOM             from "react-dom";
import styles               from "components/Autocomplete/Autocomplete.scss";
import SuggestionsList      from "components/SuggestionsList/SuggestionsList.react";

export default class Autocomplete extends Component {
  constructor(props) {
    super(props);

    this.deactivate = this.deactivate.bind(this);
    this.activate = this.activate.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.toggle = this.toggle.bind(this);

    this.onClick = this.onClick.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.getPosition = this.getPosition.bind(this);
    this.recalculatePosition = this.recalculatePosition.bind(this);

    this.onInputClick = this.onInputClick.bind(this);
    this.onExternalClick = this.onExternalClick.bind(this);

    this.inputRef = React.createRef(null);
    this.dropdownRef = React.createRef(null);

    this.handleScroll = () => {
      const pos = this.getPosition();
      this.dropdownRef.current.setPosition(pos);
    };
    this.handleResize = () => {
      const pos = this.getPosition();
      this.dropdownRef.current.setPosition(pos);
    };

    this.state = {
      activeSuggestion: 0,
      filteredSuggestions: [],
      showSuggestions: false,
      userInput: "",
      label: props.label,
      position: null
    };
  }

  componentDidMount() {
    this.node = ReactDOM.findDOMNode(this);
    this.recalculatePosition();
    window.addEventListener("resize", this.handleResize);
    this.node.addEventListener("scroll", this.handleScroll);
    this._ignoreBlur = false;
  }

  setIgnoreBlur(ignore) {
    this._ignoreBlur = ignore;
  }

  componentWillUnmount() {
    this.node.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
  }

  getPosition() {
    let newPosition = this.props.fixed
      ? Position.inWindow(this.node)
      : Position.inDocument(this.node);

    newPosition.y += this.node.offsetHeight;

    return newPosition;
  }

  recalculatePosition() {
    const position = this.getPosition();
    // update position of dropdown w/o rerendering this whole component
    this.dropdownRef.current
      ? this.dropdownRef.current.setPosition(position)
      : this.setState({ position }, () => this.forceUpdate());
  }

  getSuggestions(userInput) {
    const { suggestions, buildSuggestions } = this.props;
    // either rely on external logic to recalculate suggestioons,
    // or just filter by input
    const filteredSuggestions = buildSuggestions
      ? buildSuggestions(userInput)
      : suggestions.filter(
          suggestion =>
            suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
        );
    return filteredSuggestions;
  }

  getLabel(userInput) {
    return this.props.label || this.props.buildLabel(userInput);
  }

  onChange(e) {
    const userInput = e.currentTarget && e.currentTarget.value;

    const filteredSuggestions = this.getSuggestions(userInput);
    const label = this.getLabel(userInput);

    this.setState({
      active: true,
      activeSuggestion: 0,
      filteredSuggestions,
      showSuggestions: true,
      userInput,
      label,
      error: undefined
    });

    this.props.onChange && this.props.onChange(userInput);
  }

  onClick(e) {
    const userInput = e.currentTarget.innerText;
    const label = this.props.label || this.props.buildLabel(userInput);

    this.inputRef.current.focus();
    this.setIgnoreBlur(false);

    this.setState(
      {
        activeSuggestion: 0,
        filteredSuggestions: [],
        showSuggestions: false,
        userInput,
        label
      },
      () => {
        this.props.onClick && this.props.onClick(e);
      }
    );
  }

  onFocus(e) {
    if (!this._ignoreBlur) {
      this.setIgnoreBlur(true);
    }

    this.activate(e);
  }

  onExternalClick(e) {
    if (this._ignoreBlur) {
      // because events flow in order: onFocus:input -> onClick:popover -> onClick:input
      // need to ignore the click that initially focuses the input field
      // otherwise it will hide the dropdown instantly.
      // _ignoreBlur will be unset in input click handler right after.
      return;
    }
    if (e.target.id !== this.inputRef.current.id) {
      this.deactivate();
    }
  }

  onInputClick() {
    this.setIgnoreBlur(false);
  }

  activate(e) {
    const userInput = e.currentTarget && e.currentTarget.value;

    const position = this.getPosition();
    const filteredSuggestions = this.getSuggestions(userInput);
    const label = this.getLabel(userInput);

    this.setState(
      {
        active: true,
        filteredSuggestions,
        position,
        label,
        showSuggestions: true
      },
      () => {
        this.props.onFocus && this.props.onFocus();
      }
    );
  }

  deactivate() {
    this.setIgnoreBlur(true);

    this.setState(
      {
        active: false,
        showSuggestions: false,
        activeSuggestion: 0
      },
      () => {
        this.props.onBlur && this.props.onBlur();
      }
    );
  }

  resetInput() {
    this.setState(
      {
        active: false,
        activeSuggestion: 0,
        showSuggestions: false,
        userInput: ""
      },
      () => {
        this.inputRef.current.blur();
      }
    );
  }

  onKeyDown(e) {
    const { activeSuggestion, filteredSuggestions } = this.state;

    // Enter
    const { userInput } = this.state;
    if (userInput && userInput.length > 0) {
      if (e.keyCode === 13) {
        this.props.onSubmit(userInput);
      }
    } else if (e.keyCode === 9) {
      // Tab
      e.preventDefault(); // do not type it
      this.inputRef.current.focus();
      this.setState({
        active: true,
        activeSuggestion: 0,
        showSuggestions: false,
        userInput: filteredSuggestions[activeSuggestion]
      });
    } else if (e.keyCode === 38) {
      // arrow up
      if (activeSuggestion === 0) {
        return;
      }

      this.setState({
        active: false,
        activeSuggestion: activeSuggestion - 1
      });
    } else if (e.keyCode === 40) {
      // arrow down
      if (activeSuggestion - 1 === filteredSuggestions.length) {
        return;
      }

      this.setState({
        active: false,
        activeSuggestion: activeSuggestion + 1
      });
    }
  }

  toggle(visible) {
    this.setState({ visible });
  }
  render() {
    const {
      onExternalClick,
      onInputClick,
      onChange,
      onClick,
      onFocus,
      onKeyDown,
      props: { suggestionsStyle, inputStyle, placeholder, locked, error },
      state: {
        activeSuggestion,
        filteredSuggestions,
        showSuggestions,
        userInput,
        visible,
        active,
        label,
        value
      }
    } = this;

    const fieldClassName = [
      styles.field,
      (locked ? active : active || value) && styles.active,
      error ? styles.error : undefined,
      showSuggestions &&
        visible &&
        filteredSuggestions.length &&
        styles.dropdown
    ].join(" ");

    const inputClasses = [error && styles.error].join(" ");

    let suggestionsListComponent;
    if (showSuggestions && visible && filteredSuggestions.length) {
      suggestionsListComponent = (
        <SuggestionsList
          position={this.state.position}
          ref={this.dropdownRef}
          onExternalClick={onExternalClick}
          suggestions={filteredSuggestions}
          suggestionsStyle={suggestionsStyle}
          activeSuggestion={activeSuggestion}
          onClick={onClick}
        />
      );
    }

    return (
      <React.Fragment>
        <div className={fieldClassName}>
          <input
            id={1}
            type="text"
            autoComplete="off"
            className={inputClasses}
            placeholder={placeholder}
            ref={this.inputRef}
            style={inputStyle}
            value={userInput}
            onClick={onInputClick}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
          />
          <label htmlFor={1} className={error && styles.error}>
            {error || label}
          </label>
        </div>
        {suggestionsListComponent}
      </React.Fragment>
    );
  }
}
