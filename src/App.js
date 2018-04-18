import React, { Component } from 'react';
import { Route, Switch, Link } from 'react-router-dom';
import * as BooksAPI from './BooksAPI';
import './App.css';

function ListBooksTitle() {
  return (
    <div className="list-books-title">
      <h1>MyReads</h1>
    </div>
  );
}

function Book(props) {
  return (
    <li>
      <div className="book">
        <div className="book-top">
          <div
            className="book-cover"
            style={{
              width: 128,
              height: 193,
              backgroundImage: `url(${props.book.thumbnail})`
            }}
          />
          <div className="book-shelf-changer">
            <handleShelfSelectContext.Consumer>
              {handleShelfSelect => (
                <select
                  onChange={e => handleShelfSelect(e, props.book)}
                  value={props.book.shelf || 'none'}
                >
                  <option value="none" disabled>
                    Move to...
                  </option>
                  <option value="currentlyReading">Currently Reading</option>
                  <option value="wantToRead">Want to Read</option>
                  <option value="read">Read</option>
                  <option value="none">None</option>
                </select>
              )}
            </handleShelfSelectContext.Consumer>
          </div>
        </div>
        <div className="book-title">{props.book.title}</div>
        {props.book.authors &&
          props.book.authors.map((author, index) => (
            <div className="book-authors" key={index}>
              {author}
            </div>
          ))}
      </div>
    </li>
  );
}

function Bookshelf(props) {
  return (
    <div className="bookshelf">
      <h2 className="bookshelf-title">{props.title}</h2>
      <div className="bookshelf-books">
        <ol className="books-grid">
          <stateContext.Consumer>
            {stateContextValue => {
              const myReads = stateContextValue.myReads;
              const BookComponent = myReads
                .filter(books => books.shelf === props.value)
                .map((book, index) => <Book key={index} book={book} />);
              return BookComponent;
              // Attention! Without BookComponent declaration and return expression,
              // the Consumer will not mount. I don't know the reason.
            }}
          </stateContext.Consumer>
        </ol>
      </div>
    </div>
  );
}

class ListBooksContent extends Component {
  renderBookshelf = (title, value) => <Bookshelf title={title} value={value} />;
  render() {
    const shelfTierInfo = [
      { title: 'Currently Reading', value: 'currentlyReading' },
      { title: 'Want to Read', value: 'wantToRead' },
      { title: 'Read', value: 'read' }
    ];
    return (
      <div className="list-books-content">
        {shelfTierInfo.map((shelfTier, index) => (
          <React.Fragment key={index}>
            {this.renderBookshelf(shelfTier.title, shelfTier.value)}
          </React.Fragment>
        ))}
      </div>
    );
  }
}

function OpenSearch() {
  return (
    <div className="open-search">
      <Link to="/search">Add a book</Link>
    </div>
  );
}

function ListBooks() {
  return (
    <React.Fragment>
      <ListBooksTitle />
      <ListBooksContent />
      <OpenSearch />
    </React.Fragment>
  );
}

class SearchBooksBar extends Component {
  render() {
    return (
      <div className="search-books-bar">
        <Link className="close-search" to="/">
          Close
        </Link>
        <div className="search-books-input-wrapper">
          <stateContext.Consumer>
            {stateContextValue => (
              <updateSearchQueryContext.Consumer>
                {updateSearchQuery => {
                  const searchQuery = stateContextValue.searchQuery;
                  console.log(searchQuery);
                  return (
                    <input
                      type="text"
                      placeholder="Search by title or author"
                      onChange={updateSearchQuery}
                      value={searchQuery}
                    />
                  );
                }}
              </updateSearchQueryContext.Consumer>
            )}
          </stateContext.Consumer>
        </div>
      </div>
    );
  }
}

class SearchBookResults extends Component {
  render() {
    return (
      <div className="search-books-results">
        <ol className="books-grid">
          <stateContext.Consumer>
            {stateContextValue => {
              const searchBookResults = stateContextValue.searchBookResults;
              const BookComponent = searchBookResults.map((book, index) => (
                <Book key={index} book={book} />
              ));
              return BookComponent;
            }}
          </stateContext.Consumer>
        </ol>
      </div>
    );
  }
}

function SearchBooks() {
  return (
    <React.Fragment>
      <SearchBooksBar />
      <SearchBookResults />
    </React.Fragment>
  );
}

const stateContext = React.createContext();
const handleShelfSelectContext = React.createContext();
const updateSearchQueryContext = React.createContext();

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      myReads: [],
      searchBookResults: [],
      searchQuery: ''
    };
  }

  filterRawBookData = rawBooks =>
    rawBooks.map(book => ({
      id: book.id,
      title: book.title,
      authors: book.authors,
      thumbnail: book.imageLinks.thumbnail,
      shelf: book.shelf || 'none'
    }));

  componentDidMount() {
    // Set initial books on shelf
    BooksAPI.getAll().then(rawBooks => {
      console.log(rawBooks);
      if (rawBooks && rawBooks instanceof Array) {
        const books = this.filterRawBookData(rawBooks);
        console.log(books);
        this.setState({
          myReads: books
        });
      }
    });
  }

  handleShelfSelect = (e, book) => {
    const shelf = e.target.value;
    const myReads = this.state.myReads;
    console.log(myReads);

    const searchBookResults = this.state.searchBookResults;
    const bookId = book.id;
    let onShelf = false;

    // If book in myReads changes shelf, then update it
    for (const book of myReads) {
      if (book.id === bookId) {
        book.shelf = shelf;
        onShelf = true;
      }
    }

    // If not in myReads then push to it
    !onShelf && myReads.push(book);

    // If book in search results changes shelf, then update it
    for (const book of searchBookResults) {
      if (book.id === bookId) {
        book.shelf = shelf;
      }
    }

    // Update book info to server
    BooksAPI.update(book, shelf);

    this.setState({ myReads, searchBookResults });
  };

  mergeSearchedBooksAndMyReads = (searchedBookResults, myReads) => {
    searchedBookResults.forEach(book => {
      for (const item of myReads) {
        if (book.id === item.id) {
          book.shelf = item.shelf;
        }
      }
    });
    return searchedBookResults;
  };

  updateSearchQuery = e => {
    const newQuery = e.target.value;
    this.setState({
      searchQuery: newQuery
    });

    BooksAPI.search(newQuery, 20).then(searchedBooksOri => {
      if (searchedBooksOri && searchedBooksOri instanceof Array) {
        const searchedBooks = this.filterRawBookData(searchedBooksOri);
        const finalSearchedBooks = this.mergeSearchedBooksAndMyReads(
          searchedBooks,
          this.state.myReads
        );
        this.setState({ searchBookResults: finalSearchedBooks });
      }
    });
  };

  render() {
    return (
      <React.StrictMode>
        <stateContext.Provider value={this.state}>
          {/* Attention! You must make this handleShelfSelectContext provider common for Book component,
          since the nested components share the same Book subcomponent,
          otherwise it causes Typeerror: handleShelfSelect is not a function */}
          <handleShelfSelectContext.Provider value={this.handleShelfSelect}>
            <Switch>
              <Route exact path="/" render={() => <ListBooks />} />
              <Route
                exact
                path="/search"
                render={() => (
                  <updateSearchQueryContext.Provider
                    value={this.updateSearchQuery}
                  >
                    <SearchBooks />
                  </updateSearchQueryContext.Provider>
                )}
              />
            </Switch>
          </handleShelfSelectContext.Provider>
        </stateContext.Provider>
      </React.StrictMode>
    );
  }
}

export default App;
