import React from 'react';
import {
  trim,
  match,
  map,
  toLower,
  groupBy,
  isEmpty,
  sortBy,
  prop,
  compose,
} from 'ramda';

import { max, parse, format } from 'date-fns';
// file uploader
import Dropzone from 'react-dropzone';

const groupByRestaurants = data => {
  const byRestaurant = groupBy(order => order.restaurant);
  return byRestaurant(data);
};

// a workaround for long mailto links, from https://goo.gl/PT4WXo
const sendEmails = ({ meals, restaurant }) => {
  const timeout = 2000;

  const mailtoPrefix = `mailto:?subject=${restaurant} arrived, your food is here&body=Hello, \n Please find your selected futufriday food at the kitchen. \n Regards, FutuFriday Team&bcc=`;

  const maxUrlCharacters = 1900;
  const separator = ';';
  let currentIndex = 0;
  let nextIndex = 0;
  const emails =
    restaurant && meals[restaurant].map(meal => meal.email).join(';');

  if (!emails) {
    return;
  }

  if (emails.length < maxUrlCharacters) {
    window.location = mailtoPrefix + emails;
    return;
  }

  do {
    currentIndex = nextIndex;
    nextIndex = emails.indexOf(separator, currentIndex + 1);
  } while (nextIndex !== -1 && nextIndex < maxUrlCharacters);

  if (currentIndex === -1) {
    window.location = mailtoPrefix + emails;
  } else {
    window.location = mailtoPrefix + emails.slice(0, currentIndex);
    setTimeout(function() {
      sendEmails(emails.slice(currentIndex + 1));
    }, timeout);
  }
};
/*
 * input array of objects, containing orders
 * outputs the same array, by extracting and putting the restaurant name as a property
 */
const extractRestaurantNames = surveyData => {
  const restaurantNamePattern = /\[.+\]/;
  return surveyData.map(order => {
    if (!order.meal) return '';
    return {
      meal: trim(order.meal || ''),
      restaurant: toLower(
        match(restaurantNamePattern, trim(order.meal))[0] ||
          '[unknown_restaurant]',
      ),
      email: order['Email Address'],
      requestedBy: order['Email Address'].split('@')[0],
    };
  });
};

const groupByMeals = data => {
  const reducer = (acc, order) => {
    if (!acc[order.meal]) {
      acc[order.meal] = 1;
    } else {
      acc[order.meal] = acc[order.meal] + 1;
    }

    return acc;
  };

  const countMeals = value => value.reduce(reducer, {});

  return map(countMeals, data);
};

/**
 * getLatestOrder
 * Which order is the newest?
 * @returns {Date}
 */
const getLatestOrder = ({ orders = [] }) =>
  max.apply(null, orders.map(order => parse(order.Timestamp)));
// Stateless React components start here!
export const RestaurantOrders = ({ surveyData = [] }) => {
  const orders = groupByMeals(
    groupByRestaurants(extractRestaurantNames(surveyData)),
  );
  return (
    <div className="restaurant-orders">
      {isEmpty(orders) &&
        <p className="restaurant-orders__p">
          Orders and buttons will appear down here after uploading the file
        </p>}
      {!isEmpty(orders) &&
        <p className="restaurant-orders__p">
          The following need to be sent to the restaurants by email
        </p>}
      {orders &&
        Object.keys(orders).map((restaurant, i) =>
          <div key={i} className="restaurant-orders__div">
            <span className="restaurant-orders__span">
              {' '}{restaurant}{' '}
            </span>
            <ul>
              {Object.keys(orders[restaurant]).map((food, i) =>
                <li key={i}>
                  <b> {orders[restaurant][food]} </b> X {food}
                </li>,
              )}{' '}
            </ul>
          </div>,
        )}
    </div>
  );
};

// who ordered what
export const WhoOrderedWhat = ({ surveyData = [] }) => {
  const orders = surveyData.map(order => ({
    name: order['Email Address'].split('@')[0].replace(/\./g, ' '),
    meal: order.meal,
    Timestamp: order.Timestamp,
  }));
  const sortByNameCaseInsensitive = sortBy(compose(toLower, prop('name')));
  const sortedOrders = sortByNameCaseInsensitive(orders);

  return (
    <div className="who-ordered-what">
      <ol className="who-ordered-what__ol">
        <p className="restaurant-orders__p">
          <b> Who orderd what? </b>
        </p>
        {sortedOrders &&
          sortedOrders.map((order, i) =>
            <li className="who-ordered-what__li" key={i}>
              <span className="who-ordered-what__span"> {order.name}</span>{' '}
              {order.meal} {' '}
              <i className="who-ordered-what__i">
                Ordered on {format(order.Timestamp, 'MMM, Do YYYY')}
              </i>
            </li>,
          )}
      </ol>
    </div>
  );
};

export const Mailer = ({ surveyData = [] }) => {
  const meals = groupByRestaurants(extractRestaurantNames(surveyData));

  if (isEmpty(meals)) return <div />;
  return (
    <div className="mailer">
      <div className="mailer__div">
        {meals &&
          <p className="mailer__p">
            Press each button to send an email to the ones who have ordered from
            that restaurant. (opens your email client)
          </p>}
        <div className="mailer__wrapper">
          {meals &&
            Object.keys(meals).map((restaurant, i) =>
              <div key={i}>
                <a
                  onClick={() => sendEmails({ meals, restaurant })}
                  className="mail-link"
                >
                  <b className="restaurant-name">
                    {restaurant.replace('[', '').replace(']', '')}
                  </b>{' '}
                  Arrived!
                </a>
              </div>,
            )}
        </div>
      </div>
    </div>
  );
};

export const AdminSwitch = ({ handleChange }) => {
  return (
    <label className="switch-light switch-ios">
      <input
        type="checkbox"
        onChange={event => {
          handleChange(event);
        }}
      />
      <strong>Admin View</strong>

      <span>
        <span />
        <span role="img" aria-label="admin enabled">
          💪
        </span>
        <a aria-hidden>""</a>
      </span>
    </label>
  );
};

export const LatestOrderNotice = ({ surveyData, quantity, clear }) => {
  const latestOrder = getLatestOrder({ orders: surveyData });
  return (
    <div className="latest-order">
      The latest person has ordered on: {' '}
      <b>{format(latestOrder, 'DD/MM/YYYY HH:mm')}</b>
      <br />
      {' Total: '}
      <b>
        {quantity} {' meals'}
      </b>
      <button onClick={clear} className="latest-order__button">
        Upload New CSV file
      </button>
    </div>
  );
};

export const ErrorContainer = ({ error }) => {
  if (!(error && error.details)) {
    return null;
  }

  // something went wrong with the backend
  if (error.apiError) {
    return (
      <div className="error-container">
        <p className="error-container__p">
          Can't connect to the database, however you still can upload your CSV
          file and prepare the orders for restaurants! <br /> The data won't get
          saved
        </p>
      </div>
    );
  }

  // something is probably wrong in the csv file
  return (
    error &&
    error.details &&
    error.details.map((errMessage, i) =>
      <div className="error-container" key={i}>
        <p className="error-container__p">
          <b>Problem with your uploaded .CSV file</b> Error:{' '}
          {errMessage.message} <br />These might help: <br />{' '}
        </p>
        <ul>
          {' '}<li> Make sure the Google form collects email addresses </li>
          <li> Check that the question for food is titled exactly as: meal </li>
          <li>
            {' '}Check that in every meal name, the restaurant name is tagged in
            brackets for example: [Fafa]{' '}
          </li>
          <li> Make sure you uploaded the correct CSV file </li>
          <li> Contact Omid :D </li>
          <li> Contact IT </li>
        </ul>
      </div>,
    )
  );
};

export const FileUploader = ({ onDrop }) =>
  <div className="file-uploader">
    <Dropzone
      onDrop={onDrop}
      disablePreview={true}
      multiple={false}
      style={{
        display: 'flex',
        border: '5px dashed #00BCD4',
        width: '90%',
        maxWidth: '1200px',
        minHeight: '200px',
        justifyContent: 'center',
        background: 'rgba(0, 188, 212, 0.07)',
        margin: '10px auto',
        fontSize: '26px',
        lineHeight: '3',
      }}
    >
      <p>
        Drop the orders .csv file here.
        <br /> Or click here to open a file browser
        <br /> <i> (The file that you got from google forms) </i>
      </p>
    </Dropzone>
  </div>;

export const Footer = () =>
  <footer className="footer">
    <a href="https://github.com/omidfi/food-ordering" className="fork-me">
      {' '}Fork me on Github{' '}
    </a>
  </footer>;

export const Header = ({ children }) =>
  <header className="App-header">
    <h1 className="App-title">Food Ordering</h1>
    {children}
  </header>;

export const Wrapper = ({ children }) =>
  <section className="wrapper">
    {children}
  </section>;